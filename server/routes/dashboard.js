const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth_mw');
const Simulator = require('../models/simulator');
const Room = require('../models/room');
const User = require('../models/user');
const Device = require('../models/device');
const jwt = require('jsonwebtoken');

// All dashboard routes require authentication
router.use(authenticate);

// Heartbeat endpoint that combines rooms and simulators data from the database
router.get('/heartbeat', async (req, res) => {
  try {
    // Get user's simulators
    const simulators = await Simulator.find(
      { owner: req.user.userId },
      { lastSeen: 0 } // Exclude lastSeen field
    ).lean(); // Use lean for better performance

    // Get rooms owned by user
    const rooms = await Room.find({ owner: req.user.userId }).lean();

    // Enhance simulators with their device information
    for (const simulator of simulators) {
      // Find all devices belonging to this simulator
      const devices = await Device.find({ simulatorId: simulator.id }).lean();
      
      // Attach full device information to the simulator
      simulator.devices = devices;
    }

    res.json({
      simulators: simulators,
      rooms: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/rooms/create', async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.userId;

    // Check if room already exists
    const existingRoom = await Room.findOne({ title, owner: userId });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room with this title already exists'
      });
    }

    // Create new room
    const newRoom = new Room({
      title,
      owner: userId,
      simulators: []  // Changed from instances to simulators
    });

    await newRoom.save();

    res.json({ success: true, room: newRoom });
  }
  catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add simulator to room
router.post('/rooms/add-simulator', async (req, res) => {
  try {
    const { simulatorId, roomId } = req.body;

    // Verify ownership of simulator
    const simulator = await Simulator.findOne({ id: simulatorId, owner: req.user.userId });
    if (!simulator) {
      return res.status(403).json({
        success: false,
        message: 'Simulator not found or you do not own it'
      });
    }

    // Verify ownership of room
    const targetRoom = await Room.findOne({ id: roomId, owner: req.user.userId });
    if (!targetRoom) {
      return res.status(403).json({
        success: false,
        message: 'Room not found or you do not own it'
      });
    }

    // Remove simulator from all rooms
    await Room.updateMany(
      { owner: req.user.userId },
      { $pull: { simulators: simulatorId } }
    );

    // Add to target room
    targetRoom.simulators.push(simulatorId);
    await targetRoom.save();

    // Get updated rooms
    const rooms = await Room.find({ owner: req.user.userId });

    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Remove simulator from room
router.post('/rooms/remove-simulator', async (req, res) => {
  try {
    const { simulatorId, roomId } = req.body;

    // Verify ownership of room
    const room = await Room.findOne({ id: roomId, owner: req.user.userId });
    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Room not found or you do not own it'
      });
    }

    // Remove simulator from room
    room.simulators = room.simulators.filter(id => id !== simulatorId);
    await room.save();

    // Get updated rooms
    const rooms = await Room.find({ owner: req.user.userId });

    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update simulator title
router.put('/simulator/update-title', async (req, res) => {
  try {
    const { simulatorId, title } = req.body;

    // Find simulator and verify ownership
    const simulator = await Simulator.findOne({ id: simulatorId, owner: req.user.userId });
    if (!simulator) {
      return res.status(403).json({
        success: false,
        message: 'Simulator not found or you do not own it'
      });
    }

    // Update title
    simulator.title = title;
    await simulator.save();

    res.json({ success: true, simulator: simulator });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

//Add simulator to user
router.post('/simulator/addSimulator', async (req, res) => {
  try {
    const simulatorTitle = req.body.title;
    const userId = req.user.userId;
    const timeToLive = req.body.timeToLive || '30d';

    // Generate a temporary ID for the awaiting simulator
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const simulatorToken = jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: timeToLive }
    );

    //add simulator to the database
    const simulator = new Simulator({
      id: tempId, // Use a temporary ID to avoid collisions
      title: simulatorTitle,
      owner: userId,
      status: 'awaiting',
      lastSeen: Date.now(),
      expectedToken: simulatorToken
    });
    await simulator.save();

    res.status(201).json({
      token: simulatorToken,
      tempId: tempId // Return the temp ID so it can be used for updates if needed
    });

  } catch (error) {
    console.error('Error adding simulator:', error);
    res.status(500).json({
      success: false,
      message: "Error adding simulator: " + error.message
    });
  }
});

module.exports = router;