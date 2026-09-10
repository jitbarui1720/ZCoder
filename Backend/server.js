import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/room.js";
import codingRoutes from './routes/coding.js';
import session from "express-session";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL
];

console.log("Allowed origins:", allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((err, req, res, next) => {
  console.error("Global error handler caught an error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in .env");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/run", codingRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow server-to-server & tools like Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by Socket.IO CORS"));
    },
    credentials: true,
  },
  pingTimeout: 120000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
  transports: ["websocket", "polling"],
});

// In-memory store for room data and user info
const roomDataMap = new Map();
const userSocketMap = new Map(); // Track username to socket mapping
const userActivityMap = new Map(); // Track user activity to prevent premature disconnection

// Initialize room data structure
const initializeRoomData = (roomId) => {
  if (!roomDataMap.has(roomId)) {
    roomDataMap.set(roomId, {
      code: "// Write your code here...",
      language: "javascript",
      input: "",
      output: "",
      users: new Set(), // Track users in room
      lastActivity: Date.now()
    });
  }
};

// Clean up old rooms periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [roomId, roomData] of roomDataMap.entries()) {
    if (now - roomData.lastActivity > maxAge && roomData.users.size === 0) {
      console.log(`Cleaning up inactive room: ${roomId}`);
      roomDataMap.delete(roomId);
    }
  }
}, 10 * 60 * 1000);

io.on("connection", (socket) => {
  console.log('A user connected: ', socket.id);
  
  // Store socket info
  socket.roomId = null;
  socket.username = null;
  socket.isConnected = true;
  socket.lastActivity = Date.now();

  // Enhanced heartbeat mechanism
  socket.on('heartbeat', () => {
    socket.lastActivity = Date.now();
    if (socket.username) {
      userActivityMap.set(socket.username, Date.now());
    }
  });

  // Handle socket errors more gracefully
  socket.on('error', (error) => {
    console.error('Socket error for', socket.id, ':', error);
    // Don't disconnect on minor errors
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Connection error for', socket.id, ':', error);
  });

  socket.on('join_room', (data) => {
    try {
      // Handle both old format (just roomId) and new format (object with roomId and username)
      let roomId, username;
      
      if (typeof data === 'string') {
        roomId = data;
        username = `User_${socket.id.substring(0, 6)}`;
      } else if (data && typeof data === 'object') {
        roomId = data.roomId;
        username = data.username || `User_${socket.id.substring(0, 6)}`;
      } else {
        console.error('Invalid join_room data:', data);
        socket.emit('error', { message: 'Invalid room data' });
        return;
      }

      // Validate room ID
      if (!roomId || typeof roomId !== 'string') {
        console.error('Invalid room ID:', roomId);
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }

      socket.roomId = roomId;
      socket.username = username;
      socket.lastActivity = Date.now();
      
      // Track user activity
      userActivityMap.set(username, Date.now());
      
      // Leave any previous room
      if (socket.previousRoom && socket.previousRoom !== roomId) {
        socket.leave(socket.previousRoom);
        console.log(`User ${username} left previous room: ${socket.previousRoom}`);
      }
      
      socket.join(roomId);
      socket.previousRoom = roomId;
      
      console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

      // Initialize room data if it doesn't exist
      initializeRoomData(roomId);
      
      // Add user to room data
      const roomData = roomDataMap.get(roomId);
      roomData.users.add(username);
      roomData.lastActivity = Date.now();
      
      // Store user-socket mapping
      userSocketMap.set(username, socket.id);

      // Send the latest room data to the joining user
      socket.emit('receive_room_data', {
        code: roomData.code,
        language: roomData.language,
        input: roomData.input,
        output: roomData.output
      });

      // Notify other users about new user joining
      socket.to(roomId).emit('receive_message', {
        username: 'System',
        message: `${username} joined the room`,
        timestamp: Date.now()
      });

      // Update and emit user count
      const usersInRoom = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit('update_users_count', usersInRoom);
      
      console.log(`Room ${roomId} now has ${usersInRoom} users`);
    } catch (error) {
      console.error('Error in join_room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('send_message', (data) => {
    try {
      if (!data || !data.roomId || !data.username || !data.message) {
        console.error('Invalid message data:', data);
        return;
      }

      console.log(`Message from ${data.username} in room ${data.roomId}: ${data.message}`);
      
      // Update activity tracking
      socket.lastActivity = Date.now();
      userActivityMap.set(data.username, Date.now());
      
      const messageData = {
        username: data.username,
        message: data.message,
        timestamp: data.timestamp || Date.now()
      };
      
      // Update room activity
      if (roomDataMap.has(data.roomId)) {
        roomDataMap.get(data.roomId).lastActivity = Date.now();
      }
      
      // Send to all users in the room (including sender for confirmation)
      io.to(data.roomId).emit('receive_message', messageData);
    } catch (error) {
      console.error('Error in send_message:', error);
    }
  });

  socket.on('code_change', (data) => {
    try {
      if (!data || !data.roomId || data.code === undefined) {
        console.error('Invalid code change data:', data);
        return;
      }

      console.log(`Code change in room ${data.roomId} by ${socket.username}`);
      
      // Update activity tracking
      socket.lastActivity = Date.now();
      if (socket.username) {
        userActivityMap.set(socket.username, Date.now());
      }
      
      // Initialize room data if it doesn't exist
      initializeRoomData(data.roomId);

      // Update room data
      const roomData = roomDataMap.get(data.roomId);
      roomData.code = data.code;
      roomData.lastActivity = Date.now();

      // Broadcast new code to others (NOT including sender)
      socket.to(data.roomId).emit('receive_code', data.code);
    } catch (error) {
      console.error('Error in code_change:', error);
    }
  });

  socket.on('language_change', (data) => {
    try {
      if (!data || !data.roomId || !data.language) {
        console.error('Invalid language change data:', data);
        return;
      }

      console.log(`Language change in room ${data.roomId} to ${data.language}`);
      
      // Update activity tracking
      socket.lastActivity = Date.now();
      if (socket.username) {
        userActivityMap.set(socket.username, Date.now());
      }
      
      // Initialize room data if it doesn't exist
      initializeRoomData(data.roomId);

      // Update room data
      const roomData = roomDataMap.get(data.roomId);
      roomData.language = data.language;
      roomData.code = data.code || roomData.code;
      roomData.lastActivity = Date.now();

      // Broadcast language and code change to others (NOT including sender)
      socket.to(data.roomId).emit('receive_language_change', {
        language: data.language,
        code: data.code || roomData.code
      });
    } catch (error) {
      console.error('Error in language_change:', error);
    }
  });

  socket.on('input_change', (data) => {
    try {
      if (!data || !data.roomId || data.input === undefined) {
        console.error('Invalid input change data:', data);
        return;
      }

      // Update activity tracking
      socket.lastActivity = Date.now();
      if (socket.username) {
        userActivityMap.set(socket.username, Date.now());
      }

      // Initialize room data if it doesn't exist
      initializeRoomData(data.roomId);

      // Update room data
      const roomData = roomDataMap.get(data.roomId);
      roomData.input = data.input;
      roomData.lastActivity = Date.now();

      // Broadcast input change to others (NOT including sender)
      socket.to(data.roomId).emit('receive_input_change', data.input);
    } catch (error) {
      console.error('Error in input_change:', error);
    }
  });

  socket.on('output_update', (data) => {
    try {
      if (!data || !data.roomId || data.output === undefined) {
        console.error('Invalid output update data:', data);
        return;
      }

      console.log(`Output update in room ${data.roomId}`);
      
      // Update activity tracking
      socket.lastActivity = Date.now();
      if (socket.username) {
        userActivityMap.set(socket.username, Date.now());
      }
      
      // Initialize room data if it doesn't exist
      initializeRoomData(data.roomId);

      // Update room data
      const roomData = roomDataMap.get(data.roomId);
      roomData.output = data.output;
      roomData.lastActivity = Date.now();

      // Broadcast output to ALL users in the room (including sender for consistency)
      io.to(data.roomId).emit('receive_output_update', data.output);
    } catch (error) {
      console.error('Error in output_update:', error);
    }
  });

  socket.on('typing', (data) => {
    try {
      if (!data || !data.roomId || !data.username) {
        return;
      }

      // Update activity tracking
      socket.lastActivity = Date.now();
      userActivityMap.set(data.username, Date.now());

      // Only send to others, not back to sender
      socket.to(data.roomId).emit('user_typing', data.username);
    } catch (error) {
      console.error('Error in typing:', error);
    }
  });

  // New event to handle code execution start/end
  socket.on('code_execution_start', (data) => {
    try {
      if (!data || !data.roomId) return;
      
      console.log(`Code execution started in room ${data.roomId} by ${socket.username}`);
      
      // Update activity tracking - mark as very recent activity
      socket.lastActivity = Date.now();
      if (socket.username) {
        userActivityMap.set(socket.username, Date.now());
      }
      
      // Notify other users that code is being executed
      socket.to(data.roomId).emit('code_execution_status', {
        username: socket.username,
        status: 'executing'
      });
    } catch (error) {
      console.error('Error in code_execution_start:', error);
    }
  });

  socket.on('code_execution_end', (data) => {
    try {
      if (!data || !data.roomId) return;
      
      console.log(`Code execution ended in room ${data.roomId} by ${socket.username}`);
      
      // Update activity tracking
      socket.lastActivity = Date.now();
      if (socket.username) {
        userActivityMap.set(socket.username, Date.now());
      }
      
      // Notify other users that code execution is complete
      socket.to(data.roomId).emit('code_execution_status', {
        username: socket.username,
        status: 'completed'
      });
    } catch (error) {
      console.error('Error in code_execution_end:', error);
    }
  });

  socket.on('leave_room', (roomId) => {
    console.log(`User ${socket.username} leaving room ${roomId}`);
    
    socket.leave(roomId);
    
    if (roomDataMap.has(roomId)) {
      const roomData = roomDataMap.get(roomId);
      roomData.users.delete(socket.username);
    }
    
    // Remove from user-socket mapping and activity tracking
    if (socket.username) {
      userSocketMap.delete(socket.username);
      userActivityMap.delete(socket.username);
    }
    
    const usersInRoom = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('update_users_count', usersInRoom);
    
    // Notify others about user leaving
    socket.to(roomId).emit('receive_message', {
      username: 'System',
      message: `${socket.username || 'A user'} left the room`,
      timestamp: Date.now()
    });

    // Clean up room data if no users left
    if (usersInRoom === 0) {
      console.log(`Cleaning up empty room: ${roomId}`);
      roomDataMap.delete(roomId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.username || socket.id} disconnected:`, reason);
    
    // Check if this is a premature disconnection during code execution
    const recentActivity = socket.username && userActivityMap.has(socket.username) 
      ? Date.now() - userActivityMap.get(socket.username) < 60000 // Within last minute
      : false;
    
    if (recentActivity && (reason === 'ping timeout' || reason === 'transport close')) {
      console.log(`Detected potential premature disconnection for ${socket.username}, delaying cleanup`);
      
      // Delay cleanup to allow for reconnection
      setTimeout(() => {
        // Check if user has reconnected
        const currentSocket = userSocketMap.get(socket.username);
        if (!currentSocket || !io.sockets.sockets.get(currentSocket)?.connected) {
          performDisconnectCleanup(socket, reason);
        }
      }, 10000); // Wait 10 seconds for reconnection
    } else {
      performDisconnectCleanup(socket, reason);
    }
  });

  // Separate function to handle disconnect cleanup
  function performDisconnectCleanup(socket, reason) {
    if (socket.roomId) {
      // Clean up user from room
      if (roomDataMap.has(socket.roomId)) {
        const roomData = roomDataMap.get(socket.roomId);
        roomData.users.delete(socket.username);
      }
      
      // Remove from user-socket mapping and activity tracking
      if (socket.username) {
        userSocketMap.delete(socket.username);
        userActivityMap.delete(socket.username);
      }
      
      const usersInRoom = io.sockets.adapter.rooms.get(socket.roomId)?.size || 0;
      io.to(socket.roomId).emit('update_users_count', usersInRoom);
      
      // Notify others about user disconnecting
      socket.to(socket.roomId).emit('receive_message', {
        username: 'System',
        message: `${socket.username || 'A user'} disconnected`,
        timestamp: Date.now()
      });
      
      // Clean up room data if no users left
      if (usersInRoom === 0) {
        console.log(`Cleaning up empty room after disconnect: ${socket.roomId}`);
        roomDataMap.delete(socket.roomId);
      }
    }
  }

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    // Don't automatically disconnect on errors
  });
});

// Enhanced periodic cleanup for stale connections
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  // Clean up stale user activities
  for (const [username, lastActivity] of userActivityMap.entries()) {
    if (now - lastActivity > staleThreshold) {
      const socketId = userSocketMap.get(username);
      const socket = socketId ? io.sockets.sockets.get(socketId) : null;
      
      if (!socket || !socket.connected) {
        console.log(`Cleaning up stale user: ${username}`);
        userActivityMap.delete(username);
        userSocketMap.delete(username);
      }
    }
  }
}, 2 * 60 * 1000); // Run every 2 minutes

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on https://zcoder-9tx7.onrender.com`);
});