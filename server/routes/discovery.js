const express = require('express');
const router = express.Router();
const Simulator = require('../models/simulator');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Register new simulator instance
router.post('/simulators/register', async (req, res) => {
  try {
    const { simulatorId, port = 8080 } = req.body;
    const userId = req.user.userId;

    if (!simulatorId) {
      return res.status(400).json({
        success: false,
        message: 'Simulator ID is required'
      });
    }

    // Get client IP address
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress;

    if (!clientIp) {
      return res.status(400).json({
        success: false,
        message: 'Could not determine client IP address'
      });
    }

    // Create URL from IP
    const ipAddress = clientIp.replace(/^.*:/, '');
    const url = `http://${ipAddress}:${port}`;

    // Verify token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(403).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Try to find simulator by expectedToken first
    let simulator = await Simulator.findOne({ expectedToken: token });
    
    if (simulator) {
      // Simulator found by token
      console.log("Found simulator by token:", simulator.id);
      
      // Don't change the ID if already set to avoid duplicates
      if (!simulator.id) {
        simulator.id = simulatorId;
      }
      
      // Update other fields
      simulator.url = url;
      simulator.owner = userId;
      simulator.lastSeen = Date.now();
      simulator.status = 'online';
      simulator.expectedToken = null;
      
      await simulator.save();
    } else {
      // No simulator with this token, try to find by ID
      simulator = await Simulator.findOne({ id: simulatorId });
      
      if (simulator) {
        // Simulator found by ID
        console.log("Found simulator by ID:", simulator.id);
        
        // Update fields
        simulator.url = url;
        simulator.owner = userId;
        simulator.lastSeen = Date.now();
        simulator.status = 'online';
        simulator.expectedToken = null;
        
        await simulator.save();
      } else {
        // No simulator found at all
        return res.status(403).json({
          success: false,
          message: 'Simulator not found or token is invalid'
        });
      }
    }

    // Add simulator to user if not already present
    await User.findOneAndUpdate(
      { userId, simulators: { $ne: simulatorId } },
      { $push: { simulators: simulatorId } }
    );

    res.json({
      success: true,
      message: 'Simulator registered successfully',
      simulator: {
        id: simulator.id,
        url: simulator.url,
        status: simulator.status
      }
    });
  } catch (error) {
    console.error('Error registering simulator:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/simulators/token', async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeToLive = req.body.timeToLive || '30d';

    const token = jwt.sign(
      {
        userId: userId,
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: timeToLive
      })
    res.status(201).json({ token })
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Error generating token' });
  }
});

module.exports = router;