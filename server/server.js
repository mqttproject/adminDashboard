const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Import routes
const authRoutes = require('./routes/auth_route');
const apiRoutes = require('./routes/api');
const pollingService = require('./services/polling');

// Initialize app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS for dashboard requests
app.use(express.json()); // Parsing JSON bodies
app.use(morgan('combined')); // Logging
app.use(bodyParser.json());

// Mock data for simulator instances and rooms
let instances = [
    {
        id: 'ID-9106db00',
        title: 'Simulator',
        status: 'online',
        devices: [
            { id: 'dev-1', name: 'Motion sensor', type: 'motion_sensor', room: '318', ip: '192.168.1.123' },
            { id: 'dev-2', name: 'Door lock', type: 'door_lock', room: '215', ip: '192.168.1.123' }
        ]
    },
    {
        id: 'ID-9106db01',
        title: 'Simulator',
        status: 'online',
        devices: [
            { id: 'dev-3', name: 'Motion sensor', type: 'motion_sensor', room: '318', ip: '192.168.1.123' },
            { id: 'dev-4', name: 'Door lock', type: 'door_lock', room: '215', ip: '192.168.1.123' }
        ]
    },
    {
        id: 'ID-9106db02',
        title: 'Simulator',
        status: 'online',
        devices: [
            { id: 'dev-5', name: 'Motion sensor', type: 'motion_sensor', room: '318', ip: '192.168.1.123' },
            { id: 'dev-6', name: 'Door lock', type: 'door_lock', room: '215', ip: '192.168.1.123' }
        ]
    },
    {
        id: 'ID-9106db03',
        title: 'Simulator',
        status: 'online',
        devices: [
            { id: 'dev-7', name: 'Motion sensor', type: 'motion_sensor', room: '318', ip: '192.168.1.123' },
            { id: 'dev-8', name: 'Door lock', type: 'door_lock', room: '215', ip: '192.168.1.123' }
        ]
    },
    {
        id: 'ID-9106db04',
        title: 'Simulator',
        status: 'online',
        devices: [
            { id: 'dev-9', name: 'Motion sensor', type: 'motion_sensor', room: '318', ip: '192.168.1.123' },
            { id: 'dev-10', name: 'Door lock', type: 'door_lock', room: '215', ip: '192.168.1.123' }
        ]
    },
    {
        id: 'ID-9106db05',
        title: 'Simulator',
        status: 'online',
        devices: [
            { id: 'dev-11', name: 'Motion sensor', type: 'motion_sensor', room: '318', ip: '192.168.1.123' },
            { id: 'dev-12', name: 'Door lock', type: 'door_lock', room: '215', ip: '192.168.1.123' }
        ]
    }
];

let rooms = [
    {
        id: 'room-1',
        title: 'Simulator group 1',
        instances: ['ID-9106db00', 'ID-9106db01', 'ID-9106db02']
    },
    {
        id: 'room-2',
        title: 'Simulator group 2',
        instances: ['ID-9106db03', 'ID-9106db04', 'ID-9106db05']
    },
    {
        id: 'unassigned',
        instances: []
    }
];

// Routes - Modular approach
app.use('/auth_route', authRoutes);
app.use('/api', apiRoutes);

// Direct API Routes for frontend functionality

// Add a heartbeat endpoint that combines rooms and instances data
app.get('/api/heartbeat', (req, res) => {
    res.json({ instances, rooms });
});

// Add instance to room
app.post('/api/rooms/add-instance', (req, res) => {
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
app.post('/api/rooms/remove-instance', (req, res) => {
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
app.put('/api/instances/update-title', (req, res) => {
    const { instanceId, title } = req.body;
    const instance = instances.find(i => i.id === instanceId);
    
    if (instance) {
        instance.title = title;
        res.json({ success: true, instance });
    } else {
        res.status(400).json({ success: false, message: 'Instance not found' });
    }
});

// Handle simulated status changes
setInterval(() => {
    const randomIndex = Math.floor(Math.random() * instances.length);
    const instance = instances[randomIndex];

    // Toggle status occasionally
    if (Math.random() < 0.1) {
        instance.status = instance.status === 'online' ? 'offline' : 'online';
    }
}, 10000); // Every 10 seconds

// Start polling service from structured codebase
pollingService.start();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});