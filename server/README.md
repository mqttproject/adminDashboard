# Admin Dashboard Server

Backend server for the IoT device simulator admin dashboard.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or accessible remotely)

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.sample .env
   ```
   
   Update the `.env` file with your MongoDB connection string and other settings.


3. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Routes

### Dashboard Frontend API

- `GET /api/heartbeat` - Get all simulators and rooms
- `POST /api/rooms/add-instance` - Add simulator to room
- `POST /api/rooms/remove-instance` - Remove simulator from room
- `PUT /api/instances/update-title` - Update simulator title

### Device/Simulator API

- `GET /deviceapi/devices` - Get all device states
- `GET /deviceapi/device/:id` - Get specific device
- `POST /deviceapi/device/:id/:action` - Control device (on/off)
- `POST /deviceapi/device/:id` - Create/configure device
- `POST /deviceapi/devices` - Create multiple devices
- `POST /deviceapi/device/:id/delete` - Delete device
- `GET /deviceapi/configuration` - Get configuration
- `POST /deviceapi/configuration` - Update configuration
- `POST /deviceapi/reboot` - Reboot simulator

### Authentication API

- `POST /auth/login` - Authenticate user

## Structure

- `config/` - Configuration files
- `middleware/` - Express middleware
- `models/` - Mongoose models
- `routes/` - API routes
- `services/` - Business logic
- `scripts/` - Utility scripts

## Development

In development mode (`NODE_ENV=development`), authentication can be bypassed by setting `SKIP_AUTH=true` in the `.env` file.

## Connecting to Simulators

The server maintains a registry of simulator instances and their devices. Each simulator must be accessible via its URL for the server to communicate with it.

For testing, you can use the simulator in a Linux VM with the REST API running on port 8080.