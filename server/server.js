const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const authRoutes = require('./routes/auth_route');
const apiRoutes = require('./routes/api');
const pollingService = require('./services/polling');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS for dashboard requests
app.use(express.json()); // Parsing JSON bodies
app.use(morgan('combined')); // Logging

// Routes
app.use('/auth_route', authRoutes);
app.use('/api', apiRoutes);

// Start polling service
pollingService.start();


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});