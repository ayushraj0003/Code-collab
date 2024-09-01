const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Import the HTTP module
const { Server } = require('socket.io'); // Import Socket.io
const jwt = require('jsonwebtoken');
const Room = require('./models/Room'); 
const Chat=require("./models/Chat");

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
const chatRoutes=require('./routes/chat');
app.use('/api/chat',chatRoutes);

// Create an HTTP server and attach Express app to it
const server = http.createServer(app);

// Attach Socket.io to the HTTP server
const io = new Server(server, {
  cors: {
    origin: '*', // Update with your frontend's origin if necessary
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace 'your_secret_key' with your actual secret key
      const userId = decoded.userId; // Adjust based on your token's payload

      // Fetch the room to verify membership
      const room = await Room.findOne({ roomId }).populate('users');

      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      // Check if the user is a member of the room
      const isMember = room.users.some((user) => user._id.toString() === userId);

      if (isMember) {
        // Add the user to the online users set and join the room
        onlineUsers.add(userId);
        socket.join(roomId);

        // Emit the updated list of online users to the room
        io.to(roomId).emit('onlineUsers', Array.from(onlineUsers));
      } else {
        socket.emit('error', 'You are not a member of this room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Invalid token or server error');
    }
  });

  socket.on('offer', ({ offer, roomId }) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomId }) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('candidate', ({ candidate, roomId }) => {
    socket.to(roomId).emit('candidate', candidate);
  });
  socket.on('codeChange', ({ roomId, code }) => {
    socket.to(roomId).emit('codeUpdate', code);
  });

  socket.on('leaveRoom', async ({ roomId, token }) => {
    try {
      // Verify the user's token to get the user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace 'your_secret_key' with your actual secret key
      const userId = decoded.userId; // Adjust based on your token's payload

      // Remove the user from the onlineUsers set
      onlineUsers.delete(userId);

      // Leave the room and emit the updated list of online users to the room
      socket.leave(roomId);
      io.to(roomId).emit('onlineUsers', Array.from(onlineUsers));
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('error', 'Invalid token or server error');
    }
  });

  socket.on('logout', async ({ roomId, token }) => {
    try {
      // Verify the user's token to get the user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace 'your_secret_key' with your actual secret key
      const userId = decoded.userId; // Adjust based on your token's payload

      // Remove the user from the onlineUsers set
      onlineUsers.delete(userId);

      // Leave the room and emit the updated list of online users to the room
      socket.leave(roomId);
      io.to(roomId).emit('onlineUsers', Array.from(onlineUsers));
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('error', 'Invalid token or server error');
    }
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
})

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
