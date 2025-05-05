const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose')


// Import routes
const authRoutes = require('./routes/auth_route');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const pollingService = require('./services/polling');
const connectDB = require('./config/db');
const simulatorRegistry = require('./services/simulator_registry');

// Import MongoDB models 
const Room = require('./models/room');
const Device = require('./models/device');
const Simulator = require('./models/simulator');

// Connection to database
require('dotenv').config();
connectDB();

// Initialize app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS for dashboard requests
app.use(express.json()); // Parsing JSON bodies
app.use(morgan('combined')); // Logging
app.use(bodyParser.json());  

// Initialization of an empty rooms collection in case none exist
async function initRooms() {
    const Room = require('./models/room');
    const count = await Room.countDocuments();
    
    if (count === 0) {
      await Room.insertMany([
        {
          id: 'room-1',
          title: 'Simulator group 1',
          simulatorIds: []
        },
        {
          id: 'room-2',
          title: 'Simulator group 2',
          simulatorIds: []
        },
        {
          id: 'unassigned',
          title: 'Unassigned',
          simulatorIds: []
        }
      ]);
      console.log('Initialized default rooms');
    }
  }
  
initRooms().catch(err => console.error('Error initializing rooms:', err));

// Dashboard API Routes
const dashboardRouter = express.Router();

// Get heartbeat data - all instances and rooms
dashboardRouter.get('/heartbeat', async (req, res) => {
  try {
    // Get data from MongoDB
    const rooms = await Room.find({});
    const simulators = await Simulator.find({});
    const devices = await Device.find({});
    
    // Transform data to match what frontend expects
    const instancesData = simulators.map(simulator => {
      const simulatorDevices = devices.filter(d => d.simulatorId === simulator.id);
      return {
        id: simulator.id,
        title: simulator.title || 'Simulator',
        status: simulator.status || 'offline',
        devices: simulatorDevices.map(d => ({
          id: d.id,
          name: d.action || 'Device',
          type: d.action === 'doorLockAction' ? 'door_lock' : 'motion_sensor',
          room: '---', // Default room value
          ip: d.broker?.replace('tcp://', '').split(':')[0] || 'Unknown'
        }))
      };
    });
    
    // Format rooms data for the frontend
    const roomsData = rooms.map(room => ({
      id: room.id,
      title: room.title || 'Unnamed Room',
      instances: room.simulatorIds || []
    }));
    
    res.json({ 
      instances: instancesData,
      rooms: roomsData 
    });
  } catch (error) {
    console.error('Error fetching heartbeat data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Add instance to room
dashboardRouter.post('/rooms/add-instance', async (req, res) => {
  const { instanceId, roomId } = req.body;
  
  try {
    // First remove instance from all rooms
    await Room.updateMany(
      { simulatorIds: instanceId },
      { $pull: { simulatorIds: instanceId } }
    );
    
    // Then add to the target room
    await Room.findOneAndUpdate(
      { id: roomId },
      { $addToSet: { simulatorIds: instanceId } }
    );
    
    // Get updated rooms for response
    const rooms = await Room.find({});
    const roomsData = rooms.map(room => ({
      id: room.id,
      title: room.title || 'Unnamed Room',
      instances: room.simulatorIds || []
    }));
    
    res.json({ success: true, rooms: roomsData });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Remove instance from room
dashboardRouter.post('/rooms/remove-instance', async (req, res) => {
  const { instanceId, roomId } = req.body;
  
  try {
    // Remove from specified room
    await Room.findOneAndUpdate(
      { id: roomId },
      { $pull: { simulatorIds: instanceId } }
    );
    
    // Add to unassigned room
    await Room.findOneAndUpdate(
      { id: 'unassigned' },
      { $addToSet: { simulatorIds: instanceId } }
    );
    
    // Get updated rooms for response
    const rooms = await Room.find({});
    const roomsData = rooms.map(room => ({
      id: room.id,
      title: room.title || 'Unnamed Room',
      instances: room.simulatorIds || []
    }));
    
    res.json({ success: true, rooms: roomsData });
  } catch (error) {
    console.error('Error removing instance from room:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Update instance title
dashboardRouter.put('/instances/update-title', async (req, res) => {
  const { instanceId, title } = req.body;
  
  try {
    const updatedSimulator = await Simulator.findOneAndUpdate(
      { id: instanceId },
      { title: title },
      { new: true }
    );
    
    if (!updatedSimulator) {
      return res.status(404).json({ success: false, message: 'Instance not found' });
    }
    
    res.json({ 
      success: true, 
      instance: {
        id: updatedSimulator.id,
        title: updatedSimulator.title,
        status: updatedSimulator.status
      } 
    });
  } catch (error) {
    console.error('Error updating instance title:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Routes - Modular approach
app.use('/auth_route', authRoutes);
app.use('/deviceapi', apiRoutes); //for now it's deviceapi, later it will be api
app.use('/api', dashboardRoutes.router);

pollingService.start();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});