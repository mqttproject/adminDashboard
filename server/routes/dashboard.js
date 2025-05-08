const express = require('express');
const router = express.Router();
const Simulator = require('../models/simulator');
const Device = require('../models/device');
const Room = require('../models/room');
const simulatorRegistry = require('../services/simulator_registry');

// Heartbeat endpoint

router.get('/heartbeat', async (req, res) => {
  try {
    // Get all simulators with their devices
    const simulators = await Simulator.find({});
    const rooms = await Room.find({});
    
    // Check if we need to assign unassigned simulators
    const unassignedRoom = rooms.find(room => room.id === 'unassigned');
    if (unassignedRoom) {
      const allSimulatorIds = simulators.map(sim => sim.id);
      const assignedSimulatorIds = rooms.reduce((acc, room) => 
        room.id !== 'unassigned' ? [...acc, ...(room.simulatorIds || [])] : acc, []);
      
      const unassignedSimulatorIds = allSimulatorIds.filter(id => 
        !assignedSimulatorIds.includes(id));
      
      // Update unassigned room if needed
      if (unassignedSimulatorIds.length > 0 && 
          JSON.stringify(unassignedRoom.simulatorIds.sort()) !== 
          JSON.stringify(unassignedSimulatorIds.sort())) {
        
        console.log(`Updating unassigned room with ${unassignedSimulatorIds.length} simulators`);
        unassignedRoom.simulatorIds = unassignedSimulatorIds;
        await unassignedRoom.save();
      }
    }
    
    // Helper function to get device type from action
    function getDeviceType(action) {
      if (!action) return 'unknown_device';
      
      // Map of action names to device types
      const deviceTypeMap = {
        'doorLockAction': 'door_lock',
        'roomTemperatureAction': 'temperature_sensor',
        'coffeeAction': 'coffee_machine',
        // Add more mappings as needed for future device types
      };
      
      return deviceTypeMap[action] || 'unknown_device';
    }
    
    // Helper function to extract IP from broker address
    function extractIpFromBroker(broker) {
      if (!broker) return 'Unknown';
      
      try {
        // Handle tcp:// prefix in MQTT broker addresses
        return broker.replace(/^tcp:\/\//, '').split(':')[0];
      } catch (error) {
        return 'Unknown';
      }
    }
    
    // Transform simulators for response
    const instancesData = await Promise.all(simulators.map(async (simulator) => {
      const devices = await Device.find({ simulatorId: simulator.id });
      
      return {
        id: simulator.id,
        title: simulator.title || 'Simulator',
        status: simulator.status || 'offline',
        url: simulator.url,
        devices: devices.map(d => ({
          id: d.id,
          name: d.id, // The device ID is used as the display name
          action: d.action, // Include the action type
          type: getDeviceType(d.action),
          room: d.room || '---',
          ip: extractIpFromBroker(d.broker),
          broker: d.broker || 'Unknown'
        }))
      };
    }));
    
    // Format rooms for the frontend
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
router.post('/rooms/add-instance', async (req, res) => {
  const { instanceId, roomId } = req.body;
  
  try {
    // Find the simulator
    const simulator = await Simulator.findOne({ id: instanceId });
    if (!simulator) {
      return res.status(404).json({ success: false, message: 'Simulator not found' });
    }
    
    // Remove from all rooms first
    await Room.updateMany(
      { simulatorIds: instanceId },
      { $pull: { simulatorIds: instanceId } }
    );
    
    // Add to the new room
    await Room.findOneAndUpdate(
      { id: roomId },
      { $addToSet: { simulatorIds: instanceId } }
    );
    
    // Get updated rooms
    const rooms = await Room.find({});
    
    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Error adding instance to room:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Remove instance from room
router.post('/rooms/remove-instance', async (req, res) => {
  const { instanceId, roomId } = req.body;
  
  try {
    // Remove from the specified room
    await Room.findOneAndUpdate(
      { id: roomId },
      { $pull: { simulatorIds: instanceId } }
    );
    
    // Add to unassigned room
    await Room.findOneAndUpdate(
      { id: 'unassigned' },
      { $addToSet: { simulatorIds: instanceId } }
    );
    
    // Get updated rooms
    const rooms = await Room.find({});
    
    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Error removing instance from room:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update instance title
router.put('/instances/update-title', async (req, res) => {
  const { instanceId, title } = req.body;
  
  try {
    const simulator = await Simulator.findOneAndUpdate(
      { id: instanceId },
      { title },
      { new: true }
    );
    
    if (!simulator) {
      return res.status(404).json({ success: false, message: 'Instance not found' });
    }
    
    res.json({ success: true, instance: simulator });
  } catch (error) {
    console.error('Error updating instance title:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = { router };

/*
// This will store references to the data from server.js
let instances;
let rooms;

// Function to inject data references from server.js
const setData = (instancesRef, roomsRef) => {
  instances = instancesRef;
  rooms = roomsRef;
};

// Heartbeat endpoint that combines rooms and instances data
router.get('/heartbeat', (req, res) => {
  res.json({ instances, rooms });
});

// Add instance to room
router.post('/rooms/add-instance', (req, res) => {
  const { instanceId, roomId } = req.body;
  const room = rooms.find(r => r.id === roomId);
  
  if (room && !room.instances.includes(instanceId)) {
    // Remove from other rooms first, including unassigned
    rooms.forEach(r => {
      r.instances = r.instances.filter(id => id !== instanceId);
    });

    // Add to the new room
    room.instances.push(instanceId);
    res.json({ success: true, rooms });
  } else {
    res.status(400).json({ success: false, message: 'Room not found or instance already in room' });
  }
});

// Remove instance from room
router.post('/rooms/remove-instance', (req, res) => {
  const { instanceId, roomId } = req.body;
  const room = rooms.find(r => r.id === roomId);
  
  if (room) {
    room.instances = room.instances.filter(id => id !== instanceId);
    
    // Add to unassigned room
    const unassignedRoom = rooms.find(r => r.id === 'unassigned');
    if (unassignedRoom && !unassignedRoom.instances.includes(instanceId)) {
      unassignedRoom.instances.push(instanceId);
    }
    
    res.json({ success: true, rooms });
  } else {
    res.status(400).json({ success: false, message: 'Room not found' });
  }
});

// Update instance title
router.put('/instances/update-title', (req, res) => {
  const { instanceId, title } = req.body;
  const instance = instances.find(i => i.id === instanceId);
  
  if (instance) {
    instance.title = title;
    res.json({ success: true, instance });
  } else {
    res.status(400).json({ success: false, message: 'Instance not found' });
  }
});

module.exports = { router, setData }; */