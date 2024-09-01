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
        const messages = await Chat.find({ roomNo: req.params.roomId }).populate('sender', 'name avatar');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
})
router.post('/:roomId', verifyToken, async (req, res) => {
    const { senderId, message } = req.body;
    const { roomId } = req.params;
  

  
    try {
      const newMessage = new Chat({
        roomNo: roomId,
        sender:senderId,
        message,
      });
  
      const savedMessage = await newMessage.save();
      res.json(savedMessage);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });
  
  module.exports = router;