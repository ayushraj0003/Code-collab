const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto')
require('dotenv').config();

const router = express.Router();

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

// Register Route
router.post('/register', async (req, res) => {
  const { name, email, password, mobile, avatar } = req.body;

  try {

      let user = await User.findOne({ email });
      if (user) {
          return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({ name, email, password, mobile, avatar });
      await user.save();

      const payload = { userId: user.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      res.status(201).json({ token });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});
// Login Route

router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (otps[email] && otps[email] === otp) {
      delete otps[email]; // OTP is valid, remove it from temporary storage
      res.status(200).json({ message: 'OTP verified successfully' });
  } else {
      res.status(400).json({ error: 'Invalid OTP' });
  }
});
const otps = {}; // Store OTPs temporarily, you may use a database or cache for this in production

router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    console.log(email)
    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP temporarily
    otps[email] = otp;

    // Send OTP via email using nodemailer
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error)
            return res.status(500).json({ error: 'Failed to send OTP' });
        } else {
            res.status(200).json({ message: 'OTP sent successfully' });
        }
    });
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = { userId: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET);

        res.json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/details', verifyToken, async (req, res) => {
    try {
      // Fetch user details using the ID from the token payload
      console.log('User ID from token:', req.user.userId);
      const user = await User.findById(req.user.userId)
    //   .select('-password'); // Exclude the password field
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  router.get('/:userId', verifyToken, async (req, res) => {
    try {
      const user = await User.findById(req.params.userId).select('name');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });



module.exports = router;