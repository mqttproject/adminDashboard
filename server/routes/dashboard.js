const express = require('express');
const router = express.Router();

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

module.exports = { router, setData };