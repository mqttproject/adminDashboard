const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth_mw');
const simulatorRegistry = require('../services/simulator_registry');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all device states
router.get('/devices', (req, res) => {
  res.json(simulatorRegistry.getAllStates());
});

// Get specific device
router.get('/device/:id', async (req, res) => {
  const { id } = req.params;
  const simulatorUrl = simulatorRegistry.getSimulatorUrl(id);
  
  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  try {
    const response = await axios.get(`${simulatorUrl}/device/${id}`);
    simulatorRegistry.updateState(id, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error communicating with device',
      details: error.message
    });
  }
});

// Device control (on/off)
router.post('/device/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const simulatorUrl = simulatorRegistry.getSimulatorUrl(id);
  
  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  if (action !== 'on' && action !== 'off') {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/device/${id}/${action}`);
    
    // Update cache after control action
    setTimeout(async () => {
      try {
        const statusResponse = await axios.get(`${simulatorUrl}/device/${id}`);
        simulatorRegistry.updateState(id, statusResponse.data);
      } catch (e) {
        console.error(`Failed to update device state: ${e.message}`);
      }
    }, 500);
    
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error controlling device',
      details: error.message
    });
  }
});

// Create/configure device
router.post('/device/:id', async (req, res) => {
  const { id } = req.params;
  const { action, broker, simulatorUrl } = req.body;
  
  if (!simulatorUrl) {
    return res.status(400).json({ error: 'Simulator URL is required' });
  }
  
  // Register in our registry
  simulatorRegistry.registerSimulator(id, simulatorUrl);
  
  try {
    const response = await axios.post(`${simulatorUrl}/device/${id}`, {
      action,
      broker
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error creating device',
      details: error.message
    });
  }
});

// Get configuration
router.get('/configuration', async (req, res) => {
  // This would need to aggregate configurations from all simulators
  const configs = {};
  
  for (const id of simulatorRegistry.getAllSimulators()) {
    const url = simulatorRegistry.getSimulatorUrl(id);
    try {
      const response = await axios.get(`${url}/configuration`);
      configs[id] = response.data;
    } catch (error) {
      console.error(`Error fetching config for ${id}: ${error.message}`);
    }
  }
  
  res.json(configs);
});

// Update configuration
router.post('/configuration', async (req, res) => {
  const { simulatorUrl, config } = req.body;
  
  if (!simulatorUrl) {
    return res.status(400).json({ error: 'Simulator URL is required' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/configuration`, config);
    
    // Update simulator registry with any new devices
    if (config.devices) {
      Object.keys(config.devices).forEach(deviceId => {
        simulatorRegistry.registerSimulator(deviceId, simulatorUrl);
      });
    }
    
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error updating configuration',
      details: error.message
    });
  }
});

// Reboot simulator
router.post('/reboot', async (req, res) => {
  const { simulatorUrl } = req.body;
  
  if (!simulatorUrl) {
    return res.status(400).json({ error: 'Simulator URL is required' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/reboot`);
    
    // Mark all devices from this simulator as potentially offline
    simulatorRegistry.markSimulatorRebooting(simulatorUrl);
    
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error rebooting simulator',
      details: error.message
    });
  }
});

module.exports = router;