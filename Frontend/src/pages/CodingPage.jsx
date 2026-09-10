import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;

const CodingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const roomId = query.get("roomId");
  const username = query.get("username");
  const roomName = query.get("roomName");
  const initialLanguage = query.get("language") || "c++";

  const [code, setCode] = useState("// Write your code here...");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [usersCount, setUsersCount] = useState(1);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState(initialLanguage);
  const [fadeError, setFadeError] = useState(false);
  const [isUpdatingFromSocket, setIsUpdatingFromSocket] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const typingTimeoutRef = useRef(null);
  const inputTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastOutputRef = useRef("");
  const reconnectTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to get default code for language
  const getDefaultCodeForLanguage = (lang) => {
    switch (lang) {
      case "javascript":
        return "// Write your JavaScript code here...";
      case "python":
        return "# Write your Python code here...";
      case "c++":
        return "// Write your C++ code here...";
      case "c":
        return "// Write your C code here...";
      default:
        return "// Write your code here...";
    }
  };

  // Enhanced reconnection logic
  const handleReconnection = () => {
    if (isReconnectingRef.current) return;

    isReconnectingRef.current = true;
    setSocketConnected(false);

    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Attempt to reconnect after a delay
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        console.log("Attempting manual reconnection...");
        socketRef.current.connect();
      }
      isReconnectingRef.current = false;
    }, 2000);
  };

  useEffect(() => {
    if (!username || !roomId) {
      navigate("/home");
      return;
    }

    // Initialize socket connection with better configuration
    socketRef.current = io(`${API_URL}`, {
      transports: ["websocket", "polling"], // Added polling as fallback
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      maxReconnectionAttempts: 5,
      forceNew: true, // Force new connection to avoid conflicts
      autoConnect: true,
    });

    const socket = socketRef.current;

    // Socket connection handling
    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      setSocketConnected(true);
      isReconnectingRef.current = false;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Join room after connection is established
      socket.emit("join_room", { roomId, username });
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
      setSocketConnected(false);

      // Handle different disconnect reasons
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        handleReconnection();
      } else if (reason === "transport close" || reason === "transport error") {
        // Network issues, try to reconnect
        handleReconnection();
      }
      // Don't reconnect for client-initiated disconnects
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setSocketConnected(false);

      // Only attempt reconnection if not already reconnecting
      if (!isReconnectingRef.current) {
        handleReconnection();
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Reconnected to server after", attemptNumber, "attempts");
      setSocketConnected(true);
      isReconnectingRef.current = false;

      // Rejoin room after reconnection
      socket.emit("join_room", { roomId, username });
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("Reconnection attempt", attemptNumber);
    });

    socket.on("reconnect_error", (error) => {
      console.error("Reconnection failed:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("Failed to reconnect after maximum attempts");
      setSocketConnected(false);
      isReconnectingRef.current = false;
    });

    // Receive initial room data when joining
    socket.on("receive_room_data", (roomData) => {
      console.log("Received room data:", roomData);
      setIsUpdatingFromSocket(true);

      // Only update if we have valid data
      if (roomData.code !== undefined) {
        setCode(roomData.code || getDefaultCodeForLanguage(initialLanguage));
      }
      if (roomData.language !== undefined) {
        setLanguage(roomData.language || initialLanguage);
      }
      if (roomData.input !== undefined) {
        setInput(roomData.input || "");
      }

      // Only update output if there's actual output data
      if (roomData.output && roomData.output.trim() !== "") {
        setOutput(roomData.output);
        lastOutputRef.current = roomData.output;
      }

      setTimeout(() => setIsUpdatingFromSocket(false), 100);
    });

    socket.on("receive_code", (newCode) => {
      console.log("Received code update:", newCode);
      if (!isUpdatingFromSocket && newCode !== undefined) {
        setIsUpdatingFromSocket(true);
        setCode(newCode);
        setTimeout(() => setIsUpdatingFromSocket(false), 100);
      }
    });

    socket.on("receive_language_change", (data) => {
      console.log("Received language change:", data);
      if (!isUpdatingFromSocket) {
        setIsUpdatingFromSocket(true);
        setLanguage(data.language);
        setCode(data.code);
        // Only clear output if it's empty or default message
        if (
          !lastOutputRef.current ||
          lastOutputRef.current === "No output yet..."
        ) {
          setOutput("");
        }
        setTimeout(() => setIsUpdatingFromSocket(false), 100);
      }
    });

    socket.on("receive_input_change", (newInput) => {
      console.log("Received input change:", newInput);
      if (!isUpdatingFromSocket) {
        setInput(newInput);
      }
    });

    socket.on("receive_output_update", (newOutput) => {
      console.log("Received output update:", newOutput);
      setOutput(newOutput);
      lastOutputRef.current = newOutput;
      setError(""); // Clear any previous errors when new output arrives
    });

    socket.on("receive_message", (data) => {
      console.log("Received message:", data);
      setMessages((prev) => [...prev, data]);
    });

    socket.on("update_users_count", (count) => {
      console.log("Updated users count:", count);
      setUsersCount(count);

      if (count === 0) {
        setCode(""); // Clear code
        setInput(""); // Clear input
        setOutput(""); // Clear output
      }
    });

    socket.on("user_typing", (typingUser) => {
      if (typingUser === username) return;

      setTypingUsers((prevTypingUsers) => {
        if (!prevTypingUsers.includes(typingUser)) {
          return [...prevTypingUsers, typingUser];
        }
        return prevTypingUsers;
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prevTypingUsers) =>
          prevTypingUsers.filter((user) => user !== typingUser)
        );
      }, 3000);
    });

    return () => {
      // Cleanup function
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }

      // Only disconnect socket, do NOT clear code or input
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("leave_room", roomId);
        socketRef.current.disconnect();
      }
    };
  }, [username, roomId, navigate, initialLanguage]);

  const handleCodeChange = (newValue) => {
    if (
      !isUpdatingFromSocket &&
      socketRef.current &&
      socketRef.current.connected &&
      newValue !== undefined
    ) {
      setCode(newValue);
      socketRef.current.emit("code_change", { roomId, code: newValue });
      socketRef.current.emit("typing", { roomId, username });
    }
  };

  const showError = (msg) => {
    setError(msg);
    setFadeError(false);
    setTimeout(() => setFadeError(true), 100);
    setTimeout(() => {
      setError("");
      setFadeError(false);
    }, 5000);
  };

  // Updated handleRunCode function in CodingPage.jsx
  const handleRunCode = async () => {
    if (isRunningCode) return; // Prevent multiple simultaneous runs
    
    setIsRunningCode(true);
    setError(""); // Clear any previous errors
    const runningMessage = "Running...";
    setOutput(runningMessage);

    try {
      console.log("Sending code to server:", { code, language, input });

      const response = await fetch(`${API_URL}/api/run`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ code, language, input }),
      });

      const result = await response.json();
      const outputResult = result.output || "Code executed successfully (no output)";
      setOutput(outputResult);
      
      // Ensure that the code and input states are not reset
      // You can log the current state to verify
      console.log("Current code:", code);
      console.log("Current input:", input);
      
      // Broadcast output to other users
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("output_update", { roomId, output: outputResult });
      }
    } catch (err) {
      console.error("Error in handleRunCode:", err);
      showError(err.message || "An unknown error occurred");
    } finally {
      setIsRunningCode(false);
    }
  };


  const handleSendMessage = () => {
    if (message.trim() && socketRef.current && socketConnected) {
      const messageData = {
        username,
        roomId,
        message: message.trim(),
        timestamp: Date.now(),
      };
      console.log("Sending message:", messageData);

      // Send to server (server will broadcast to all including sender)
      socketRef.current.emit("send_message", messageData);
      setMessage("");
    }
  };

  const handleMessageInputChange = (e) => {
    setMessage(e.target.value);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing", { roomId, username });
    }
  };

  const handleInputChange = (e) => {
    const newInput = e.target.value;
    setInput(newInput);

    // Debounce input changes
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }

    inputTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("input_change", { roomId, input: newInput });
      }
    }, 300);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    const newCode = getDefaultCodeForLanguage(newLanguage);

    setLanguage(newLanguage);
    setCode(newCode);

    // Only clear output if there's no meaningful output
    if (
      !lastOutputRef.current ||
      lastOutputRef.current === "No output yet..." ||
      lastOutputRef.current === "Running..."
    ) {
      setOutput("");
      lastOutputRef.current = "";
    }

    // Broadcast language change to other users
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("language_change", {
        roomId,
        language: newLanguage,
        code: newCode,
      });
    }
  };

  const handleBackButtonClick = () => {
    // Ensure proper cleanup before navigation
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("leave_room", roomId);
      socketRef.current.disconnect();
    }
    navigate("/home");
  };

  // Connection status indicator
  const getConnectionStatus = () => {
    if (socketConnected) {
      return { text: "Connected", color: "green" };
    } else if (isReconnectingRef.current) {
      return { text: "Reconnecting...", color: "orange" };
    } else {
      return { text: "Disconnected", color: "red" };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="p-5 flex flex-col items-center
      font-['Segoe UI',Tahoma,Geneva,Verdana,sans-serif]
      bg-linear-to-br from-[#6a9cff] via-[#7f8cff] to-[#a78bfa]
    ">
      <div className="flex gap-2.5
        flex-row justify-between items-center
        w-full max-w-300 mb-5 p-2.5
      ">
        <div>
          <h1 className="text-2xl font-semibold">Welcome to {roomName}</h1>
          <div className="text-[16px] text-[#555] mt-1">
            Users in room: {usersCount}
            <span style={{ color: connectionStatus.color, marginLeft: "5px" }}>
              ({connectionStatus.text})
            </span>
          </div>
          <div className="mt-2 text-[16px] text-[#333]">
            Language:
            <select
              className="
                ml-2 p-[4px_8px] text-sm
                border border-[#ccc] rounded-sm
                bg-white cursor-pointer
                focus:outline-2
                focus:outline-[#007bff]
                focus:outline-offset-2
              "
              value={language}
              onChange={handleLanguageChange}
              disabled={isRunningCode}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="c++">C++</option>
              <option value="c">C</option>
            </select>
          </div>
        </div>
        <button className="
          text-[16px] text-[#d6c964dc] p-[6px_12px]
          bg-transparent cursor-pointer
          border border-[#d6c964dc] rounded-md
          transition-[background-color_0.3s_ease,color_0.3s_ease]
          hover:text-white
          hover:border-[#d6c964dc]
        " onClick={handleBackButtonClick}>
          Back to Home
        </button>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row 
        m-2.5 h-auto lg:h-[calc(100vh-90px)] w-full max-w-300 gap-5"
      >
        <div className="flex-none w-full lg:flex-3 flex flex-col h-auto lg:h-full mb-5 lg:mb-0">
          <MonacoEditor
            className="grow border border-[#e1e1e1] rounded-md
              overflow-hidden h-100 lg:h-150
            "
            language={language === "c++" ? "cpp" : language}
            value={code}
            onChange={handleCodeChange}
            options={{
              selectOnLineNumbers: true,
              automaticLayout: true,
              minimap: { enabled: false },
              readOnly: isRunningCode, // Prevent editing while running
            }}
          />
          <button
            className="mt-2.5 p-[12px_24px] bg-[#007bff]
              text-white border-0 rounded-md text-[16px]
              cursor-pointer self-start
              transition-colors duration-300
              hover:bg-[#0056b3]
              disabled:bg-[#6c757d]
              disabled:cursor-not-allowed
            "
            onClick={handleRunCode}
            disabled={isRunningCode}
            title={isRunningCode ? "Code is running..." : "Run your code"}
          >
            {isRunningCode ? "Running..." : "Run Code"}
          </button>
        </div>

        <div className="flex flex-col">
          <div className="mb-5 flex-1">
            <h3 className="mb-2 text-[#333] text-[16px]">Input</h3>
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Enter input for your code..."
              rows="4"
              className="w-full h-25 md:h-37.5 p-2.5
                border border-[#ccc] rounded-sm
                font-['Courier_New',Courier,monospace]
                text-[14px] resize-y
                focus:outline-2
                focus:outline-solid
                focus:outline-[#007bff]
                focus:outline-offset-2
                focus:border-[#007bff]"
              disabled={isRunningCode}
            />
          </div>
          <div className="mb-5 flex-1">
            <h3 className="mb-2 text-[#333] text-[16px]">Output</h3>
            <pre className={`
              whitespace-pre-wrap 
              max-h-37.5 md:max-h-50 
              overflow-y-auto
              p-2.5 rounded-sm
              border min-h-20 md:min-h-25
              font-['Courier_New',Courier,monospace]
              text-sm
              ${error 
                ? "bg-[#ffe6e6] text-[#d32f2f] border-[#ccc]" 
                : "bg-[#f8f8f8] text-[#333] border-[#f5c6c6]"}
              ${!Boolean(error || output) ? "italic text-[#999]" : ""}    
            `}>
              {error || output || "No output yet..."}
            </pre>
          </div>
          <div className="flex-none lg:flex-1 flex
            flex-col border border-[#e1e1e1]
            rounded-md h-75 lg:h-full bg-[#f9f9f9]
          ">
            <div className="font-semibold text-[18px]
              text-center rounded-[6px_6px_0_0] select-none
            ">
              Chat {messages.length > 0 && `(${messages.length})`}
              {!socketConnected && (
                <span style={{ fontSize: "12px", color: "#ffcccc" }}>
                  {" "}
                  - Offline
                </span>
              )}
            </div>
            <div className="
              grow p-[12px_16px] overflow-y-auto
              bg-white border-t border-t-[#ddd]
              text-sm max-h-[calc(100%-120px)]
            " aria-live="polite" aria-atomic="false">
              {messages.length === 0 ? (
                <div
                  className="text-[#999] italic p-2.5"
                >
                  No messages yet...
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={`${msg.timestamp || Date.now()}-${idx}`}
                    className="mb-2.5 wrap-break-word leading-[1.4]"
                  >
                    <strong
                      className={`
                        ${msg.username === "System" 
                          ? "text-[#666]"
                          : "text-[#007bff]"
                        }
                        `}
                    >
                      {msg.username}:
                    </strong>{" "}
                    {msg.message}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="italic text-[#666] m-[6px_16px] min-h-5 text-[13px]" aria-live="polite">
              {typingUsers.length > 0 && (
                <div className="text-[#007bff]">
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing...
                </div>
              )}
            </div>
            <div className="flex p-[12px_16px] bg-[#f1f1f1] rounded-[0_0_6px_6px] gap-2.5">
              <input
                type="text"
                value={message}
                onChange={handleMessageInputChange}
                placeholder={
                  socketConnected ? "Type your message..." : "Reconnecting..."
                }
                className="grow p-[10px_14px]
                  border border-[#ccc]
                  rounded-md text-sm 
                  outline-offset-2 outline-transparent
                  transition-colors duration-200
                  focus:outline-[#007bff]
                  focus:bg-white
                  focus:border-[#007bff]
                "
                aria-label="Type your chat message"
                disabled={!socketConnected}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                className="
                  bg-[#007bff]
                  border-0 text-white
                  p-[10px_20px] text-sm
                  cursor-pointer rounded-md
                  transition-colors duration-300
                  select-none
                  hover:bg-[#0056b3]
                "
                aria-label="Send chat message"
                disabled={!socketConnected || !message.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>

      </div>

      {error && (
        <div className={`
          text-[#d32f2f] mt-3 font-semibold
          max-w-300 w-full
          text-center bg-[#ffebee] p-2.5
          rounded-sm border border-[#f5c6c6]
        ${fadeError ? "opacity-0" : "opacity-100"}`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default CodingPage;
