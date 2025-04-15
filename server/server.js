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
const simulatorRegistry = ('./services/simulator_registry');

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

// Inject data references to the dashboard module
dashboardRoutes.setData(instances, rooms);

// Routes - Modular approach
app.use('/auth_route', authRoutes);
app.use('/deviceapi', apiRoutes); //for now it's deviceapi, later it will be api
app.use('/api', dashboardRoutes.router);

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