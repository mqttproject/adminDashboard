/*
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const Simulator = require('../models/simulator');
const Device = require('../models/device');
const { extractSimulatorUUID, extractDevicesFromConfig } = require('../utils/configHelpers');
const { authenticateSimulator, addToken, removeToken } = require('../middleware/auth_simulator');

const router = express.Router();

// This should be in environment variables
const SIMULATOR_SECRET = process.env.SIMULATOR_SECRET || 'secret-key';

// Simulator registration endpoint
router.post('/register', async (req, res) => {
  const { configuration, secret, callbackUrl } = req.body;
  
  // Validate the shared secret
  if (secret !== SIMULATOR_SECRET) {
    return res.status(401).json({ error: 'Invalid authentication secret' });
  }
  
  // Extract UUID from configuration
  const uuid = extractSimulatorUUID(configuration);
  if (!uuid) {
    return res.status(400).json({ error: 'No UUID found in configuration' });
  }
  
  // Generate authentication token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store token with metadata
  addToken(token, {
    simulatorId: uuid,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    callbackUrl: callbackUrl
  });
  
  try {
    // Create or update simulator in database
    await Simulator.findOneAndUpdate(
      { id: uuid },
      {
        url: callbackUrl,
        status: 'online',
        lastSeen: Date.now(),
        configuration: configuration,
        token: token // Store hashed in production
      },
      { upsert: true }
    );
    
    // Register all devices from configuration
    const devices = extractDevicesFromConfig(configuration);
    for (const device of devices) {
      await Device.findOneAndUpdate(
        { id: device.id },
        {
          simulatorId: uuid,
          action: device.action,
          broker: device.broker,
          lastUpdated: Date.now()
        },
        { upsert: true }
      );
    }
    
    // Return token and server info
    res.json({
      token: token,
      simulatorId: uuid,
      serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
      expiresIn: 86400 // 24 hours in seconds
    });
  } catch (error) {
    console.error('Error during simulator registration:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Token refresh endpoint
router.post('/refresh-token', authenticateSimulator, async (req, res) => {
  const oldToken = req.headers.authorization?.split(' ')[1];
  const tokenData = req.simulatorData;
  
  // Generate new token
  const newToken = crypto.randomBytes(32).toString('hex');
  
  // Update token storage
  removeToken(oldToken);
  addToken(newToken, {
    ...tokenData,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  });
  
  try {
    // Update simulator in database
    await Simulator.findOneAndUpdate(
      { id: tokenData.simulatorId },
      { 
        token: newToken,
        lastSeen: Date.now()
      }
    );
    
    res.json({
      token: newToken,
      expiresIn: 86400
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Simulator heartbeat endpoint
router.post('/heartbeat', authenticateSimulator, async (req, res) => {
  const { simulatorId } = req.simulatorData;
  
  try {
    await Simulator.findOneAndUpdate(
      { id: simulatorId },
      { 
        lastSeen: Date.now(),
        status: 'online'
      }
    );
    
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

module.exports = router;
*/