import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
// import fs from 'fs/promises';
import * as fs from 'node:fs';
import path from 'path';
// import { v4 as uuid } from "uuid";

const router = express.Router();
const execPromise = promisify(exec);

// Create a temporary directory for code execution
const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Function to generate unique filename
const generateUniqueFileName = (extension) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `temp_${timestamp}_${random}.${extension}`;
};

// Function to detect if user code uses ES modules or CommonJS
const detectModuleType = (code) => {
  // Remove single-line and multi-line comments
  const codeWithoutComments = code
    .replace(/\/\/.*$/gm, '')           // Remove // comments
    .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove /* */ comments

  const esModulePatterns = [
    /\bimport\s+.*\bfrom\b/,
    /\bexport\s+(default\s+)?/,
    /\bimport\s*\(/
  ];

  const commonJSPatterns = [
    /\brequire\s*\(/,
    /module\.exports\s*=/,
    /exports\./
  ];

  const hasESModules = esModulePatterns.some(pattern => pattern.test(codeWithoutComments));
  const hasCommonJS = commonJSPatterns.some(pattern => pattern.test(codeWithoutComments));

  // If both are present or neither, default to CommonJS for compatibility
  if (hasESModules && hasCommonJS) {
    throw new Error('Cannot mix ES modules (import/export) and CommonJS (require/module.exports) in the same file.');
  }
  if (hasESModules) {
    return 'esm';
  }
  return 'cjs';
};

const hasTopLevelImportExport = (code) => {
  // Regex to find import or export at start of a line ignoring leading whitespace
  const importExportRegex = /^\s*(import|export)\b/m;
  return importExportRegex.test(code);
};

// Function to remove lines importing fs or createRequire from module to avoid duplication
const trimUserImports = (code) => {
  const lines = code.split('\n');
  const filteredLines = lines.filter(line => {
    // Remove exact imports of 'fs' and 'createRequire'
    // Regex matches: import fs from 'fs'; or import { createRequire } from 'module';
    const trimmed = line.trim();
    if (/^import\s+fs\s+from\s+['"]fs['"];?$/.test(trimmed)) return false;
    if (/^import\s+\{\s*createRequire\s*\}\s+from\s+['"]module['"];?$/.test(trimmed)) return false;
    return true;
  });
  return filteredLines.join('\n');
};

const runJavaScriptCode = async (code, input) => {
  const moduleType = detectModuleType(code);
  const extension = moduleType === 'esm' ? 'mjs' : 'cjs'; // Use 'mjs' for ES modules
  const fileName = path.join(tempDir, generateUniqueFileName(extension));

  // Prepare input lines for processing
  const inputLines = input ? input.split('\n').filter(line => line.trim() !== '') : [];

  let modifiedCode;

  if (moduleType === 'esm') {
    // ES Modules version

    // Remove user imports for fs and createRequire to avoid duplicates
    const userHasImports = hasTopLevelImportExport(code);
    const cleanUserCode = trimUserImports(code);

    const inputMockCode = `import fs from 'fs';
import { createRequire } from 'module';
// Mock input system
let inputLines = ${JSON.stringify(inputLines)};
let inputIndex = 0;

// Create a simple prompt function
globalThis.prompt = function(question = '') {
  if (inputIndex < inputLines.length) {
    const answer = inputLines[inputIndex++];
    if (question) console.log(question + answer);
    return answer;
  }
  return '';
};

// Mock readline for input
const mockReadline = {
  createInterface: () => ({
    question: function(query, callback) {
      if (inputIndex < inputLines.length) {
        const answer = inputLines[inputIndex++];
        console.log(query + answer);
        callback(answer);
      } else {
        callback('');
      }
    },
    close: function() {}
  })
};

// For users who want to use readline directly
const rl = mockReadline.createInterface();`;

    if (userHasImports) {
      // If user code has top-level imports/exports, append as is with no try/catch
      const errorHandlerCode = `
process.on('uncaughtException', (err) => {
  console.error('Runtime Error:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Runtime Error:', reason);
});
`;

      // Append user code directly without repeating imports
      modifiedCode = inputMockCode + errorHandlerCode + '\n' + cleanUserCode;
    } else {
      // No top-level imports in user code, safe to wrap in try/catch
      modifiedCode = inputMockCode + `
try {
${cleanUserCode.split('\n').map(line => '  ' + line).join('\n')}
} catch (error) {
  console.error('Runtime Error:', error.message);
}
`;
    }
  } else {
    // CommonJS version
    modifiedCode = `
const fs = require('fs');
const readline = require('readline');

// Mock input system
let inputLines = ${JSON.stringify(inputLines)};
let inputIndex = 0;

// Create a simple prompt function
global.prompt = function(question = '') {
  if (inputIndex < inputLines.length) {
    const answer = inputLines[inputIndex++];
    if (question) console.log(question + answer);
    return answer;
  }
  return '';
};

// Mock readline for input
const rl = {
  question: function(query, callback) {
    if (inputIndex < inputLines.length) {
      const answer = inputLines[inputIndex++];
      console.log(query + answer);
      callback(answer);
    } else {
      callback('');
    }
  },
  close: function() {}
};

// Mock readline.createInterface for users
const mockReadline = {
  createInterface: () => rl
};

// Override require for readline if needed
const originalRequire = require;
require = function(module) {
  if (module === 'readline') {
    return mockReadline;
  }
  return originalRequire(module);
};

try {
  ${code}
} catch (error) {
  console.error('Runtime Error:', error.message);
}
`;
  }

  // console.log('--- Generated JavaScript code ---');
  // console.log(modifiedCode);

  await fs.promises.writeFile(fileName, modifiedCode);

  try {
    // Execute the file with the correct extension
    const { stdout, stderr } = await execPromise(`node "${fileName}"`, {
      timeout: 10000 // 10 second timeout
    });
    await fs.promises.unlink(fileName);
    return { output: stdout || stderr };
  } catch (error) {
    try {
      await fs.promises.unlink(fileName);
    } catch (unlinkError) {
      console.error('Error deleting file:', unlinkError);
    }
    return { output: error.stderr || error.message };
  }
};

// Function to run Python code with input
const runPythonCode = async (code, input) => {
  const fileName = path.join(tempDir, generateUniqueFileName('py'));

  // Prepare input for Python
  const inputLines = input ? input.split('\n').filter(line => line.trim() !== '') : [];

  // Modify the code to handle input properly
  const modifiedCode = `
import sys
from io import StringIO

# Mock input system
input_lines = ${JSON.stringify(inputLines)}
input_index = 0

def mock_input(prompt=''):
    global input_index
    if input_index < len(input_lines):
        result = input_lines[input_index]
        input_index += 1
        if prompt:
            print(prompt + result)
        return result
    return ''

# Override the built-in input function
input = mock_input

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Runtime Error: {e}")
`;

  await fs.promises.writeFile(fileName, modifiedCode);

  try {
    const { stdout, stderr } = await execPromise(`python3 "${fileName}"`, {
      timeout: 10000
    });
    await fs.promises.unlink(fileName);
    return { output: stdout || stderr };
  } catch (error) {
    try {
      await fs.promises.unlink(fileName);
    } catch (unlinkError) {
      console.error('Error deleting file:', unlinkError);
    }
    return { output: error.stderr || error.message };
  }
};

// Function to run C++ code with input
const runCppCode = async (code, input) => {
  const sourceFileName = path.join(tempDir, generateUniqueFileName('cpp'));
  const executableName = sourceFileName.replace('.cpp', '');
  const inputFileName = path.join(tempDir, `input_${Date.now()}.txt`);

  // Write input to a file
  await fs.promises.writeFile(inputFileName, input || '');

  // Write the C++ code
  await fs.promises.writeFile(sourceFileName, code);

  try {
    // Compile the C++ code
    const compileCommand = `g++ "${sourceFileName}" -o "${executableName}"`;
    const { stderr: compileError } = await execPromise(compileCommand, {
      timeout: 10000
    });

    if (compileError) {
      throw new Error(compileError);
    }

    // Execute with input redirection
    const executeCommand = `"${executableName}" < "${inputFileName}"`;
    const { stdout, stderr } = await execPromise(executeCommand, {
      timeout: 10000
    });

    // Clean up files
    await Promise.all([
      fs.promises.unlink(sourceFileName).catch(() => { }),
      fs.promises.unlink(executableName).catch(() => { }),
      fs.promises.unlink(inputFileName).catch(() => { })
    ]);

    return { output: stdout || stderr };
  } catch (error) {
    // Clean up files on error
    await Promise.all([
      fs.promises.unlink(sourceFileName).catch(() => { }),
      fs.promises.unlink(executableName).catch(() => { }),
      fs.promises.unlink(inputFileName).catch(() => { })
    ]);

    return { output: error.stderr || error.message || 'Compilation or execution error' };
  }
};

// Function to run C code with input
const runCCode = async (code, input) => {
  const sourceFileName = path.join(tempDir, generateUniqueFileName('c'));
  const executableName = sourceFileName.replace('.c', '');
  const inputFileName = path.join(tempDir, `input_${Date.now()}.txt`);

  // Write input to a file
  await fs.promises.writeFile(inputFileName, input || '');

  // Write the C code
  await fs.promises.writeFile(sourceFileName, code);

  try {
    // Compile the C code
    const compileCommand = `gcc "${sourceFileName}" -o "${executableName}"`;
    const { stderr: compileError } = await execPromise(compileCommand, {
      timeout: 10000
    });

    if (compileError) {
      throw new Error(compileError);
    }

    // Execute with input redirection
    const executeCommand = `"${executableName}" < "${inputFileName}"`;
    const { stdout, stderr } = await execPromise(executeCommand, {
      timeout: 10000
    });

    // Clean up files
    await Promise.all([
      fs.promises.unlink(sourceFileName).catch(() => { }),
      fs.promises.unlink(executableName).catch(() => { }),
      fs.promises.unlink(inputFileName).catch(() => { })
    ]);

    return { output: stdout || stderr };
  } catch (error) {
    // Clean up files on error
    await Promise.all([
      fs.promises.unlink(sourceFileName).catch(() => { }),
      fs.promises.unlink(executableName).catch(() => { }),
      fs.promises.unlink(inputFileName).catch(() => { })
    ]);

    return { output: error.stderr || error.message || 'Compilation or execution error' };
  }
};

// POST /api/run
router.post('/', async (req, res) => {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  try {
    let result;

    switch (language.toLowerCase()) {
      case 'javascript':
        result = await runJavaScriptCode(code, input);
        break;
      case 'python':
        result = await runPythonCode(code, input);
        break;
      case 'c++':
        result = await runCppCode(code, input);
        break;
      case 'c':
        result = await runCCode(code, input);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({ error: 'Error executing code', message: error.message });
  }
});

export default router;