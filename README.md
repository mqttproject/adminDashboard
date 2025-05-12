# IoT Simulator and Dashboard System

This system provides a complete IoT device simulation environment with a central management dashboard. The project consists of three main components:

1. **MQTT Broker (palvelin)**: A Node.js-based MQTT message broker that routes messages between simulated devices
2. **IoT Device Simulator (laite)**: A Go-based simulator that creates virtual IoT devices with unique network identities
3. **Admin Dashboard**: A web-based management interface with user authentication and simulator registration

## System Architecture

```
                 REST API
┌───────────────────────────┐          ┌─────────────────┐
│   IoT Device Simulator    │◄────────►│ Admin Dashboard │
│       (laite)             │          │  (Web Server)   │
│   ┌──────────────────┐    │          └─────────────────┘
│   │ Simulated Device │    │                   │
│   │    (coffee1)     │    │                   │
│   └──────┬───────────┘    │                   ▼
│          │                │          ┌─────────────────┐
│   ┌──────┴───────────┐    │          │                 │
│   │ Simulated Device │    │          │     MongoDB     │
│   │    (coffee2)     │    │          │    Database     │
│   └──────┬───────────┘    │          │                 │
│          │                │          └─────────────────┘
│   ┌──────┴───────────┐    │
│   │ Simulated Device │    │
│   │   (doorLock1)    │    │
│   └──────┬───────────┘    │
│          │                │
└──────────┼────────────────┘
           │
           ▼
    ┌─────────────────┐
    │                 │
    │   MQTT Broker   │
    │   (palvelin)    │
    │                 │
    └─────────────────┘
```

## Communication Flows

### 1. Simulator-Dashboard Communication
- **Protocol**: REST API
- **Direction**: Bidirectional
- **Purpose**: 
  - Device registration and control
  - Simulator registration and management
  - Configuration updates
  - Status reporting

### 2. Simulated Devices-MQTT Broker Communication
- **Protocol**: MQTT
- **Direction**: Bidirectional
- **Purpose**:
  - Devices publish messages to topics
  - Devices subscribe to receive messages on topics
  - Simulates real IoT device communication patterns

### 3. Dashboard-Database Communication
- **Protocol**: MongoDB driver
- **Direction**: Bidirectional
- **Purpose**:
  - User account storage
  - Simulator registration records
  - Room and organization data
  - Device state persistence

The MQTT broker does NOT act as an intermediary between the simulator and dashboard. Instead, each simulated device connects directly to the MQTT broker using its own virtual network identity, just as real IoT devices would in a production environment.

## Component Details

### MQTT Broker (palvelin)

Located in the `palvelin/` directory, this Node.js application:
- Uses the Aedes MQTT broker library
- Routes messages between simulated devices
- Listens on port 1883 for MQTT connections
- Sends welcome messages to newly connected devices

**Key Files:**
- `main.js`: MQTT broker implementation
- `package.json`: Node.js dependencies

**Starting the Broker:**
```bash
cd palvelin
npm ci
npm start
```

### IoT Device Simulator (laite)

Located in the `laite/` directory, this Go application:
- Creates multiple simulated devices within a single process
- Uses macvlan to give each device its own virtual network interface and IP address
- Simulates various IoT device types (coffee machines, door locks, temperature sensors)
- Provides a REST API (port 8080) for device/simulator control and configuration
- Uses UUID-based identification for reliable simulator tracking

**Key Files:**
- `main.go`: Main application entry point
- `device.go`: Device simulation logic
- `api.go`: REST API implementation
- `config.go`: Configuration handling
- `registration.go`: Server registration process
- `devices.toml`: Device configuration (gitignored)
- `devices.toml.template`: Template configuration

**Virtual Network:**
Each simulated device appears on the network as a separate entity with its own IP address through macvlan interfaces, creating a realistic simulation where multiple devices connect to the broker from different network locations.

**Configuration:**
The `devices.toml` file defines:
- Simulator UUID
- Network interface to use for virtual devices
- Server URL for registration
- Registration token
- Device definitions (ID, action type, broker address)

**Starting the Simulator:**
```bash
cd laite
go build
./laite
```

### Admin Dashboard

Located in the `server/` directory, this Node.js/Express application:
- Provides user authentication and management
- Manages simulator registration
- Offers a REST API for device control
- Stores persistent data in MongoDB
- Provides a web interface for device/simulator management

**Key Files:**
- `server.js`: Main server implementation
- `routes/`: API endpoints
- `models/`: MongoDB schema definitions
- `services/`: Business logic services
- `middleware/`: Express middleware

**Data Models:**
- `User`: Authentication and ownership
- `Simulator`: Registered simulation instances
- `Device`: IoT device records
- `Room`: Logical grouping of simulators

**Starting the Server:**
```bash
cd server
npm ci
npm start
```

## API Endpoints

### Dashboard API

- `/api/heartbeat`: Get all simulators and rooms
- `/api/rooms/add-instance`: Add simulator to room
- `/api/rooms/remove-instance`: Remove simulator from room
- `/api/instances/update-title`: Update simulator title
- `/api/simulators/token`: Generate registration token
- `/api/simulators/register`: Register simulator with token

### Device API

- `/api/devices`: Get all device states
- `/api/device/:id`: Get specific device
- `/api/device/:id/:action`: Control device (on/off)
- `/api/device/:id`: Create/configure device
- `/api/device/:id/delete`: Delete device
- `/api/configuration`: Get/update configuration
- `/api/reboot`: Reboot simulator

### Authentication API

- `/auth/login`: Authenticate user
- `/auth/register`: Register new user
- `/auth/profile`: Get user profile

## Security Model

The system uses a token-based authentication system:

1. **User Authentication**: JWT tokens for dashboard access
2. **Simulator Registration**: One-time registration tokens
3. **Device Control**: Implicit permission through simulator ownership

## Development Notes

- The simulator authenticates only once during registration
- Token is required only for the initial connection
- Communication after registration does not use authentication
- The server identifies simulators by their UUID, not URL
- UUID persistence allows simulators to change networks and maintain identity
- Database can be setup with the following Docker functionality

# Docker Setup for Development

This server uses Docker to provide a consistent MongoDB environment for development.

Steps to utilize: 
    1. Install Docker Desktop (and MongoDB if using Linux or Mac)
    2. Start the MongoDB container by running following in project root: docker-compose up -d

Useful Commands:
    Stop containers: docker-compose down
    View logs: docker-compose logs -f mongodb
    Reset database: docker-compose down -v (removes volumes)

## Deployment Considerations

When deploying to production:

1. **Network Configuration**: 
   - Ensure the physical interface in `devices.toml` is correctly set
   - Configure network to allow MQTT traffic on port 1883
   - Allow HTTP traffic for REST APIs

2. **Security Practices**:
   - Use HTTPS for all REST API communications
   - Use environment variables for sensitive configuration
   - Consider enabling MQTT security features

3. **MongoDB Setup**:
   - Configure a production MongoDB instance
   - Set up proper authentication and network security
   - Implement regular database backups
