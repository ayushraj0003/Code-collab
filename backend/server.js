const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Import the HTTP module
const { Server } = require('socket.io'); // Import Socket.io
const jwt = require('jsonwebtoken');
const Room = require('./models/Room'); 
const Chat = require('./models/Chat');
const User = require('./models/User'); // Add User model import

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Define your routes
const authRoutes = require('./routes/Auth');
app.use('/api/auth', authRoutes);

const roomRoutes = require('./routes/room');
app.use('/api/rooms', roomRoutes);
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// Create an HTTP server and attach Express app to it
const server = http.createServer(app);

const allowedOrigins = ["https://codesphere-flame.vercel.app","http://localhost:3000"];

// Attach Socket.io to the HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Set();

// Set up Socket.io for real-time collaboration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', async ({ roomId, token }) => {
    try {
      // Verify the user's token to get the user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      console.log(`User ${userId} attempting to join room ${roomId}`);

      // Fetch the room to verify membership with populated users
      const room = await Room.findOne({ roomId }).populate('users', '_id name');

      if (!room) {
        console.log(`Room ${roomId} not found`);
        socket.emit('roomError', { 
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found' 
        });
        return;
      }

      // Check if the user is the owner or a member of the room
      const isOwner = room.userId.toString() === userId;
      const isMember = room.users.some((user) => user._id.toString() === userId);

      if (!isOwner && !isMember) {
        console.log(`User ${userId} denied access to room ${roomId} - not a member`);
        socket.emit('roomError', { 
          code: 'ACCESS_DENIED',
          message: 'You are not authorized to access this room' 
        });
        return;
      }

      // Add the user to the online users set and join the room
      onlineUsers.add(userId);
      socket.join(roomId);
      socket.join(`chat_${roomId}`); // Join chat room for this specific room
      socket.currentUserId = userId;
      socket.currentRoomId = roomId;

      console.log(`User ${userId} successfully joined room ${roomId}`);

      // Emit success and updated list of online users to the room
      socket.emit('roomJoined', { 
        success: true,
        roomId,
        isOwner,
        message: 'Successfully joined room' 
      });
      
      io.to(roomId).emit('onlineUsers', Array.from(onlineUsers));
      
      // Notify other users in the room
      socket.to(roomId).emit('userJoinedRoom', { 
        userId,
        username: room.users.find(u => u._id.toString() === userId)?.name || 'Unknown User'
      });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('roomError', { 
        code: 'SERVER_ERROR',
        message: 'Invalid token or server error' 
      });
    }
  });

  // Enhanced code change verification
  socket.on('codeChange', async ({ roomId, code }) => {
    try {
      const userId = socket.currentUserId;
      
      if (!userId || !roomId) {
        socket.emit('error', 'Unauthorized code change attempt');
        return;
      }

      // Verify user still has access to the room
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('roomError', { 
          code: 'ROOM_NOT_FOUND',
          message: 'Room no longer exists' 
        });
        return;
      }

      const isOwner = room.userId.toString() === userId;
      const isMember = room.users.some((user) => user._id.toString() === userId);

      if (!isOwner && !isMember) {
        socket.emit('roomError', { 
          code: 'ACCESS_DENIED',
          message: 'You no longer have access to this room' 
        });
        return;
      }

      // Broadcast code change to other users in the room
      socket.to(roomId).emit('codeUpdate', code);
    } catch (error) {
      console.error('Error in code change:', error);
      socket.emit('error', 'Code change failed');
    }
  });

  // Handle group message sending - ONLY for group chat
  socket.on('sendGroupMessage', async ({ roomId, message, senderId }) => {
    try {
      console.log(`Group message from ${senderId} in room ${roomId}: ${message}`);

      // Verify user has access to the room
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('chatError', { message: 'Room not found' });
        return;
      }

      const isOwner = room.userId.toString() === senderId;
      const isMember = room.users.some((user) => user._id.toString() === senderId);

      if (!isOwner && !isMember) {
        socket.emit('chatError', { message: 'You are not authorized to send messages in this room' });
        return;
      }

      // Save message to database
      const newMessage = new Chat({
        roomNo: roomId,
        sender: senderId,
        message,
        type: 'group',
      });

      const savedMessage = await newMessage.save();
      
      // Populate sender details
      const populatedMessage = await Chat.findById(savedMessage._id).populate('sender', 'name avatar');

      // Broadcast message ONLY to users in group chat mode
      io.to(`chat_${roomId}`).emit('newGroupMessage', {
        _id: populatedMessage._id,
        roomNo: populatedMessage.roomNo,
        sender: populatedMessage.sender,
        message: populatedMessage.message,
        timestamp: populatedMessage.timestamp,
        type: populatedMessage.type
      });

      console.log(`Group message broadcasted to room ${roomId}`);

    } catch (error) {
      console.error('Error sending group message:', error);
      socket.emit('chatError', { message: 'Failed to send message' });
    }
  });

  // Handle personal message sending - ONLY for personal chat
  socket.on('sendPersonalMessage', async ({ roomId, message, senderId, receiverId }) => {
    try {
      console.log(`Personal message from ${senderId} to ${receiverId} in room ${roomId}: ${message}`);

      // Verify user has access to the room
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('chatError', { message: 'Room not found' });
        return;
      }

      const isOwner = room.userId.toString() === senderId;
      const isMember = room.users.some((user) => user._id.toString() === senderId);

      if (!isOwner && !isMember) {
        socket.emit('chatError', { message: 'You are not authorized to send messages in this room' });
        return;
      }

      // Save message to database
      const newMessage = new Chat({
        roomNo: roomId,
        sender: senderId,
        receiver: receiverId,
        message,
        type: 'personal',
      });

      const savedMessage = await newMessage.save();
      
      // Populate sender and receiver details
      const populatedMessage = await Chat.findById(savedMessage._id)
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar');

      // Emit ONLY to sender and receiver in personal chat mode
      const messageData = {
        _id: populatedMessage._id,
        roomNo: populatedMessage.roomNo,
        sender: populatedMessage.sender,
        receiver: populatedMessage.receiver,
        message: populatedMessage.message,
        timestamp: populatedMessage.timestamp,
        type: populatedMessage.type
      };

      // Find sockets of sender and receiver in this room
      const roomSockets = await io.in(`chat_${roomId}`).fetchSockets();
      
      for (const roomSocket of roomSockets) {
        if (roomSocket.currentUserId === senderId || roomSocket.currentUserId === receiverId) {
          roomSocket.emit('newPersonalMessage', messageData);
        }
      }

      console.log(`Personal message sent between ${senderId} and ${receiverId} in room ${roomId}`);

    } catch (error) {
      console.error('Error sending personal message:', error);
      socket.emit('chatError', { message: 'Failed to send message' });
    }
  });

  // Enhanced typing verification with room access check
  socket.on('typing', async ({ roomId, lineNumber, username, userId, filename }) => {
    try {
      // Validate input data
      if (!userId || userId === 'null' || !username || !roomId) {
        console.warn('Invalid typing event data received');
        return;
      }

      // Use socket's stored user info for better performance, but also verify room access
      const currentUserId = socket.currentUserId;
      const currentRoomId = socket.currentRoomId;

      if (currentUserId !== userId || currentRoomId !== roomId) {
        console.warn('Typing event user/room mismatch');
        return;
      }

      // Additional verification: Check if user still has access to the room
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('roomError', { 
          code: 'ROOM_NOT_FOUND',
          message: 'Room no longer exists' 
        });
        return;
      }

      const isOwner = room.userId.toString() === userId;
      const isMember = room.users.some((user) => user._id.toString() === userId);

      if (!isOwner && !isMember) {
        socket.emit('roomError', { 
          code: 'ACCESS_DENIED',
          message: 'You no longer have access to this room' 
        });
        return;
      }

      console.log(`✅ User ${username} (ID: ${userId}) is typing on line ${lineNumber} in room ${roomId}`);
      
      // Broadcast typing indicator to all users in the room except the sender
      socket.to(roomId).emit('userTyping', {
        lineNumber,
        username,
        userId,
        filename,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in typing event:', error);
    }
  });

  // Enhanced stopped typing event handler
  socket.on('stoppedTyping', ({ roomId, userId, filename }) => {
    try {
      // Validate input data
      if (!userId || userId === 'null' || !roomId) {
        console.warn('Invalid stopped typing event data received:', { 
          roomId: roomId || 'missing', 
          userId: userId || 'missing', 
          filename 
        });
        return;
      }

      // Use socket's stored user info for consistency
      const currentUserId = socket.currentUserId;
      const currentRoomId = socket.currentRoomId;

      if (currentUserId !== userId || currentRoomId !== roomId) {
        console.warn('Stopped typing event user/room mismatch');
        return;
      }
      
      console.log(`✅ User ID ${userId} stopped typing in room ${roomId}`);
      
      // Broadcast stopped typing to all users in the room except the sender
      socket.to(roomId).emit('userStoppedTyping', {
        userId,
        filename,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in stopped typing event:', error);
    }
  });

  socket.on('leaveRoom', async ({ roomId, token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Remove the user from the onlineUsers set
      onlineUsers.delete(userId);

      // Leave both the main room and chat room
      socket.leave(roomId);
      socket.leave(`chat_${roomId}`);
      
      // Emit the updated list of online users to the room
      io.to(roomId).emit('onlineUsers', Array.from(onlineUsers));
      
      // Notify other users
      socket.to(roomId).emit('userLeftRoom', { userId });
      
      console.log(`User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up user from online users when they disconnect
    if (socket.currentUserId) {
      onlineUsers.delete(socket.currentUserId);
      
      if (socket.currentRoomId) {
        io.to(socket.currentRoomId).emit('onlineUsers', Array.from(onlineUsers));
        socket.to(socket.currentRoomId).emit('userLeftRoom', { 
          userId: socket.currentUserId 
        });
      }
    }
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));