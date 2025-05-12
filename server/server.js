const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose')
const { extractSimulatorUUID } = require('./utils/configHelpers');


// Import routes and services
const authRoutes = require('./routes/auth_route');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const pollingService = require('./services/polling');
const syncService = require('./services/sync-service')
const connectDB = require('./config/db');
const simulatorRegistry = require('./services/simulator_registry');

const discoveryRoutes = require('./routes/discovery');
//const simplifiedDiscoveryRoutes = require('./routes/simplified-discovery');

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

//Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/dashboard', dashboardRoutes.router);
app.use('/api/discovery', discoveryRoutes); 
//app.use('/api/', simplifiedDiscoveryRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

// Enhanced cleanup function for duplicate simulators
async function cleanupDuplicateSimulators() {
  console.log("Cleaning up duplicate simulators...");
  
  try {
    // Find all simulators
    const simulators = await Simulator.find({});
    
    // Group simulators by URL
    const urlGroups = {};
    simulators.forEach(sim => {
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
        
        // Prefer UUID-based IDs over IP-based IDs
        const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
        let keepSimulator = null;
        const removeSimulators = [];
        
        urlGroups[url].forEach(sim => {
          if (!ipPattern.test(sim.id)) {
            // This is a UUID-based ID, prefer to keep this one
            keepSimulator = sim;
          } else {
            // This is an IP-based ID, mark for removal
            removeSimulators.push(sim);
          }
        });
        
        // If no UUID-based simulator found, keep the first one
        if (!keepSimulator) {
          keepSimulator = urlGroups[url][0];
          removeSimulators.splice(0, 1);
        }
        
        console.log(`Keeping simulator ${keepSimulator.id}`);
        
        // Migrate devices from simulators to be removed
        for (const removeSimulator of removeSimulators) {
          console.log(`Migrating devices from ${removeSimulator.id} to ${keepSimulator.id}`);
          
          // Update devices to use the kept simulator ID
          const updateResult = await Device.updateMany(
            { simulatorId: removeSimulator.id },
            { simulatorId: keepSimulator.id }
          );
          console.log(`Migrated ${updateResult.modifiedCount} devices`);
          
          // Update room references
          await Room.updateMany(
            { simulatorIds: removeSimulator.id },
            { $pull: { simulatorIds: removeSimulator.id } }
          );
          
          await Room.updateMany(
            { },
            { $addToSet: { simulatorIds: keepSimulator.id } }
          );
          
          // Delete the duplicate simulator
          await Simulator.deleteOne({ _id: removeSimulator._id });
          console.log(`Deleted duplicate simulator ${removeSimulator.id}`);
        }
      }
    }
    
    // Clean up any IP-based simulators that don't have a URL
    const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
    const ipBasedSimulators = await Simulator.find({
      id: { $regex: ipPattern }
    });
    
    console.log(`Found ${ipBasedSimulators.length} IP-based simulators to check`);
    
    for (const ipSimulator of ipBasedSimulators) {
      // Check if there's a UUID-based simulator with the same URL
      const uuidSimulator = await Simulator.findOne({
        url: ipSimulator.url,
        id: { $not: { $regex: ipPattern } }
      });
      
      if (uuidSimulator) {
        console.log(`Found UUID simulator ${uuidSimulator.id} for IP simulator ${ipSimulator.id}`);
        
        // Migrate devices
        await Device.updateMany(
          { simulatorId: ipSimulator.id },
          { simulatorId: uuidSimulator.id }
        );
        
        // Update rooms
        await Room.updateMany(
          { simulatorIds: ipSimulator.id },
          { 
            $pull: { simulatorIds: ipSimulator.id },
            $addToSet: { simulatorIds: uuidSimulator.id }
          }
        );
        
        // Delete the IP-based simulator
        await Simulator.deleteOne({ _id: ipSimulator._id });
        console.log(`Deleted IP-based simulator ${ipSimulator.id}`);
      }
    }
    
    console.log("Simulator cleanup complete");
  } catch (error) {
    console.error('Error cleaning up simulators:', error);
  }
}

// Function to clean up orphaned devices
async function cleanupOrphanedDevices() {
  console.log("Cleaning up orphaned devices...");
  
  try {
    // Get all valid simulator IDs
    const simulators = await Simulator.find({});
    const validSimulatorIds = simulators.map(s => s.id);
    
    // Find and delete devices with invalid simulator IDs
    const result = await Device.deleteMany({
      simulatorId: { $nin: validSimulatorIds }
    });
    
    if (result.deletedCount > 0) {
      console.log(`Deleted ${result.deletedCount} orphaned devices`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned devices:', error);
  }
}

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
    
    // Run all cleanup operations
    await cleanupDuplicateSimulators(); // Enhanced cleanup for duplicates
    await cleanupOrphanedDevices();     // Clean up orphaned devices
    await cleanupSimulators();          // Original cleanup function
    
    await initRooms().catch(err => console.error('Error initializing rooms:', err));
    
    // Start services ONLY after database operations are complete
    pollingService.start();
    syncService.start();
    await ensureSimulatorUuidConsistency();
    
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

async function checkSimulatorUrls() {
  const simulators = await Simulator.find({});
  console.log('Checking simulator URLs:');
  
  for (const simulator of simulators) {
    console.log(`Simulator ${simulator.id}: URL = ${simulator.url}`);
    
    try {
      const response = await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
      console.log(`  Status: Reachable - Response status: ${response.status}`);
    } catch (error) {
      console.error(`  Status: Unreachable - Error: ${error.message}`);
    }
  }
}

async function ensureSimulatorUuidConsistency() {
  try {
    console.log("Running UUID consistency check for all simulators...");
    const simulators = await Simulator.find({});
    
    let updatedCount = 0;
    
    for (const simulator of simulators) {
      try {
        if (!simulator.url) {
          console.warn(`Simulator ${simulator.id} has no URL, skipping UUID check`);
          continue;
        }
        
        // Try to get the configuration to extract UUID
        console.log(`Fetching configuration from ${simulator.url}/configuration`);
        const response = await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
        
        // Process only if we get a valid response
        if (response.data && typeof response.data === 'object') {
          // Extract UUID from the configuration
          const uuid = extractSimulatorUUID(response.data);
          
          if (!uuid) {
            console.warn(`Could not extract UUID from simulator ${simulator.id} at ${simulator.url}`);
            continue;
          }
          
          // If the current ID is not the UUID, update it
          if (simulator.id !== uuid) {
            console.log(`Updating simulator ${simulator.id} to use UUID ${uuid}`);
            updatedCount++;
            
            // Create/update a simulator with UUID
            await Simulator.findOneAndUpdate(
              { id: uuid },
              { 
                url: simulator.url,
                title: simulator.title || 'Simulator',
                status: 'online',
                lastSeen: Date.now()
              },
              { upsert: true }
            );
            
            // Update device references
            await Device.updateMany(
              { simulatorId: simulator.id },
              { simulatorId: uuid }
            );
            
            // Update room references
            await Room.updateMany(
              { simulatorIds: simulator.id },
              { $pull: { simulatorIds: simulator.id } }
            );
            
            await Room.updateMany(
              { },
              { $addToSet: { simulatorIds: uuid } }
            );
            
            // Delete the old record
            if (simulator.id !== uuid) {
              await Simulator.deleteOne({ id: simulator.id });
            }
          } else {
            console.log(`Simulator ${simulator.id} already using correct UUID`);
          }
        }
      } catch (error) {
        console.warn(`Could not update simulator ${simulator.id}: ${error.message}`);
      }
    }
    
    console.log(`UUID consistency check completed: ${updatedCount} simulators updated`);
  } catch (error) {
    console.error('Error in UUID consistency check:', error);
  }
}

checkSimulatorUrls().catch(err => console.error('URL check error:', err));
setInterval(ensureSimulatorUuidConsistency, 30 * 60 * 1000);
// Start the server
startServer();