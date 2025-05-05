const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { authenticate } = require('../middleware/auth_mw');

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password,
      simulatorIds: []
    });

    await user.save();

    // Generate token with UUID as user identifier
    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: '30d'
      }
    );
    res.status(201).json({ token, user: { userId: user.userId, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: "Error crating account" });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token with UUID as user identifier
    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: '30d'
      }
    );

    res.json({ token, user: { userId: user.userId, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-password').select('-__v').select('-_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;