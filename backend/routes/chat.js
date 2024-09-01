const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const router = express.Router();
const mongoose = require('mongoose'); 


function verifyToken(req, res, next) {
    const token = req.header('Authorization').split(' ')[1]; // Extract token from the header
  
    if (!token) {
      return res.status(401).json({ message: 'Access Denied. No token provided.' });
    }
  
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your secret key
      req.user = decoded; // Attach user payload to request object
      next();
    } catch (err) {
      res.status(400).json({ message: 'Invalid Token' });
    }
  }

  router.get('/:roomId', async (req, res) => {
    try {
        const messages = await Chat.find({ roomNo: req.params.roomId, type: 'group' }).populate('sender', 'name avatar');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/:roomId', verifyToken, async (req, res) => {
    const { senderId, message } = req.body;
    const { roomId } = req.params;
  

  
    try {
      const newMessage = new Chat({
        roomNo: roomId,
        sender:senderId,
        message,
        type: 'group',
      });
  
      const savedMessage = await newMessage.save();
      res.json(savedMessage);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });
  router.post('/personal/:roomId', verifyToken, async (req, res) => {
    const { message, receiverId } = req.body;
    const { roomId } = req.params;
    const senderId = req.user.userId;
    console.log(roomId)
    console.log(message,receiverId)
    console.log(senderId)

    try {
        const newMessage = new Chat({
            roomNo: roomId,
            sender: senderId,
            message,
            receiver: receiverId || null, // If no receiverId is provided, it will be null
            type: 'personal',
        });

        const savedMessage = await newMessage.save();
        res.json(savedMessage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Route to fetch messages between two users in a specific room
router.get('/:roomId/personal/:receiverId', verifyToken, async (req, res) => {
    const { roomId, receiverId } = req.params;
    const senderId = req.user.userId;
    try {
        const messages = await Chat.find({
            roomNo: roomId,
            type: 'personal',
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).populate('sender', 'name avatar').populate('receiver', 'name avatar');

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

  
module.exports = router;