const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial data to client
    socket.on('getInitialData', () => {
        socket.emit('initialData', { instances, rooms });
    });

    // Handle adding instance to room
    socket.on('addInstanceToRoom', ({ instanceId, roomId }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && !room.instances.includes(instanceId)) {
            // Remove from other rooms first, including unassigned
            rooms.forEach(r => {
                r.instances = r.instances.filter(id => id !== instanceId);
            });

            // Add to the new room
            room.instances.push(instanceId);
            io.emit('roomUpdate', rooms);
        }
    });

    // Handle removing instance from room
    socket.on('removeInstanceFromRoom', ({ instanceId, roomId }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room.instances = room.instances.filter(id => id !== instanceId);
            
            // Add to unassigned room
            const unassignedRoom = rooms.find(r => r.id === 'unassigned');
            if (unassignedRoom && !unassignedRoom.instances.includes(instanceId)) {
                unassignedRoom.instances.push(instanceId);
            }
            
            io.emit('roomUpdate', rooms);
        }
    });

    // Handle updating instance title
    socket.on('updateInstanceTitle', ({ instanceId, title }) => {
        const instance = instances.find(i => i.id === instanceId);
        if (instance) {
            instance.title = title;
            io.emit('instanceUpdate', instance);
        }
    });

    // Handle simulated status changes
    // This would be connected to the actual simulators in a real implementation
    const simulateStatusChanges = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * instances.length);
        const instance = instances[randomIndex];

        // Toggle status occasionally
        if (Math.random() < 0.1) {
            instance.status = instance.status === 'online' ? 'offline' : 'online';
            io.emit('instanceUpdate', instance);
        }
    }, 10000); // Every 10 seconds

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        clearInterval(simulateStatusChanges);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});