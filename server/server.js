const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');

// Import database connection
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth_route');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const pollingService = require('./services/polling');
const simulatorRegistration = require('./routes/discovery');

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

// Routes - Modular approach
app.use('/auth', authRoutes);
app.use('/api', apiRoutes); 
app.use('/api', dashboardRoutes);
app.use('/api', simulatorRegistration);

// Start polling service from structured codebase
pollingService.start();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});