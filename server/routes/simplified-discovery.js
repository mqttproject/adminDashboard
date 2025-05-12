// server/routes/simplified-discovery.js - With better error handling

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Simulator = require('../models/simulator');
const Room = require('../models/room');

const router = express.Router();

// Generate a token for simulator registration
router.post('/simulators/token', async (req, res) => {
  try {
    console.log("Token generation request received");
    
    // In the full version, this would come from authentication
    // For debugging, we'll use a fixed value
    const userId = "test-user";
    const timeToLive = req.body.timeToLive || '30d';

    // Generate a token
    const token = jwt.sign(
      {
        userId: userId,
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: timeToLive
      });
    
    console.log(`Generated token: ${token}`);
      
    try {
      // For debugging, we'll also save this token in a simulator record
      // This simulates what the dashboard would do
      const simulator = new Simulator({
        id: crypto.randomUUID(), // Generate a random ID if not provided
        title: req.body.title || 'Test Simulator',
        status: 'awaiting',
        lastSeen: Date.now(),
        expectedToken: token
      });
      
      await simulator.save();
      console.log(`Created new simulator with ID: ${simulator.id} and token saved`);
      
      res.status(201).json({ token, simulatorId: simulator.id })
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Even if database save fails, still return the token
      res.status(201).json({ 
        token, 
        warning: "Token generated but simulator record failed to save"
      });
    }
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ 
      error: 'Error generating token', 
      details: error.message 
    });
  }
});

// Simulator registration endpoint
router.post('/simulators/register', async (req, res) => {
  try {
    console.log("Registration request received:", req.body);
    
    const { simulatorId, port = 8080 } = req.body;

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

    console.log(`Client IP address: ${clientIp}`);

    // Create URL from IP
    const ipAddress = clientIp.replace(/^.*:/, '');
    const url = `http://${ipAddress}:${port}`;
    
    console.log(`Generated URL: ${url}`);

    // Verify token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(403).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    console.log(`Token received: ${token}`);

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      console.log("Token successfully verified");
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Try to find simulator by expectedToken first
    let simulator = await Simulator.findOne({ expectedToken: token });
    
    if (simulator) {
      console.log("Found simulator by token:", simulator.id);
      
      // Don't change the ID if already set to avoid duplicates
      if (!simulator.id) {
        simulator.id = simulatorId;
      }
      
      // Update other fields
      simulator.url = url;
      simulator.lastSeen = Date.now();
      simulator.status = 'online';
      simulator.expectedToken = null;  // Clear token after successful registration
      
      await simulator.save();
      console.log("Simulator record updated");
    } else {
      console.log("No simulator found with token, looking for ID:", simulatorId);
      // No simulator with this token, try to find by ID
      simulator = await Simulator.findOne({ id: simulatorId });
      
      if (simulator) {
        console.log("Found simulator by ID:", simulator.id);
        
        // Update fields
        simulator.url = url;
        simulator.lastSeen = Date.now();
        simulator.status = 'online';
        simulator.expectedToken = null;
        
        await simulator.save();
        console.log("Simulator record updated");
      } else {
        console.log("No simulator found with ID or token");
        // No simulator found at all
        return res.status(403).json({
          success: false,
          message: 'Simulator not found or token is invalid'
        });
      }
    }

    // Add to unassigned room if not already in a room
    try {
      const isAssigned = await Room.findOne({ simulatorIds: simulator.id });
      if (!isAssigned) {
        console.log("Adding simulator to unassigned room");
        await Room.findOneAndUpdate(
          { id: 'unassigned' },
          { $addToSet: { simulatorIds: simulator.id } }
        );
      }
    } catch (roomError) {
      console.error("Error handling room assignment:", roomError);
      // Continue even if room assignment fails
    }

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

// Add a simple GET endpoint to list all simulators
router.get('/simulators', async (req, res) => {
  try {
    const simulators = await Simulator.find({});
    res.json({ 
      count: simulators.length,
      simulators: simulators.map(sim => ({
        id: sim.id,
        title: sim.title,
        url: sim.url,
        status: sim.status,
        hasToken: !!sim.expectedToken
      }))
    });
  } catch (error) {
    console.error('Error listing simulators:', error);
    res.status(500).json({ error: 'Error listing simulators' });
  }
});

module.exports = router;