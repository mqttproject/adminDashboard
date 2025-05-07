const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose')


// Import routes and services
const authRoutes = require('./routes/auth_route');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const pollingService = require('./services/polling');
const syncService = require('./services/sync-service')
const connectDB = require('./config/db');
const simulatorRegistry = require('./services/simulator_registry');

// Import MongoDB models 
const Room = require('./models/room');
const Device = require('./models/device');
const Simulator = require('./models/simulator');

//Initialize application
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS for dashboard requests
app.use(express.json()); // Parsing JSON bodies
app.use(morgan('combined')); // Logging
app.use(bodyParser.json());  

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

//Register the dashboard router
app.use('/api', dashboardRouter);
// Routes - Modular approach
app.use('/auth_route', authRoutes);
app.use('/deviceapi', apiRoutes); //for now it's deviceapi, later it will be api

// A DB cleanup function to call on server startup to get rid of any null ID simulators
async function cleanupSimulators() {
  console.log("Cleaning up duplicate simulator entries...");
  
  // Find simulators with null ids
  const nullIdSimulators = await Simulator.find({ id: null });
  
  if (nullIdSimulators.length > 0) {
    console.log(`Found ${nullIdSimulators.length} simulators with null IDs`);
    
    // Delete these invalid entries
    const deleteResult = await Simulator.deleteMany({ id: null });
    console.log(`Deleted ${deleteResult.deletedCount} invalid simulator entries`);
  }
  
  // Find simulators with duplicate URLs
  const allSimulators = await Simulator.find({});
  const urlMap = {};
  const duplicates = [];
  
  allSimulators.forEach(sim => {
    if (sim.url) {
      if (urlMap[sim.url]) {
        duplicates.push(sim._id);
      } else {
        urlMap[sim.url] = sim._id;
      }
    }
  });
  
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate simulator entries`);
    
    // Delete the duplicates
    const deleteResult = await Simulator.deleteMany({ _id: { $in: duplicates } });
    console.log(`Deleted ${deleteResult.deletedCount} duplicate simulator entries`);
  }

  const urlGroups = {};
  allSimulators.forEach(sim => {
    if (sim.url) {
      if (!urlGroups[sim.url]) {
        urlGroups[sim.url] = [];
      }
      urlGroups[sim.url].push(sim);
    }
  });

  // For each URL that has multiple simulators
  for (const url in urlGroups) {
    if (urlGroups[url].length > 1) {
      console.log(`URL ${url} has ${urlGroups[url].length} simulator entries`);
      
      // Keep the first one, get its ID
      const keepSimulator = urlGroups[url][0];
      console.log(`Keeping simulator ${keepSimulator.id}`);
      
      // Get IDs of simulators to remove
      const removeIds = urlGroups[url].slice(1).map(s => s._id);
      
      // Update devices to use the kept simulator ID
      await Device.updateMany(
        { simulatorId: { $in: urlGroups[url].slice(1).map(s => s.id) } },
        { simulatorId: keepSimulator.id }
      );
      
      // Delete duplicate simulators
      const deleteResult = await Simulator.deleteMany({ _id: { $in: removeIds } });
      console.log(`Deleted ${deleteResult.deletedCount} duplicate simulators`);
    }
  }
  console.log("Simulator cleanup complete");
}

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

async function startServer() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // First connect to database
    await connectDB();
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    
    // Then run cleanup and initialization
    await cleanupSimulators();
    console.log("Simulator cleanup complete");
    
    await initRooms().catch(err => console.error('Error initializing rooms:', err));
    
    // Start services ONLY after database operations are complete
    pollingService.start();
    syncService.start();
    
    // Finally, start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    console.log("Database cleanup completed successfully");
  } catch (error) {
    console.error("Error during startup:", error);
    process.exit(1);
  }
}

// Start the server
startServer();