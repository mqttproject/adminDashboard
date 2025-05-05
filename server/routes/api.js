const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth_mw');
const simulatorRegistry = require('../services/simulator_registry');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all device states
router.get('/devices', async (req, res) => {
  try {
    const states = await simulatorRegistry.getAllStates();
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device states' });
  }
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
    console.error(`Error fetching device ${id}:`, error.message);
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
    console.error(`Error controlling device ${id}:`, error.message);
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
    console.error(`Error creating device ${id}:`, error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error creating device',
      details: error.message
    });
  }
});

// Create/configure multiple devices to a simulator
router.post('/devices', async (req, res) => {
  const { simulatorUrl, devices } = req.body;

  if (!simulatorUrl) {
    return res.status(400).json({error: 'Simulator URL is required'});
  }

  if(!devices || typeof devices !== 'object') {
    return res.status(400).json({ error: 'Devices object is required'})
  }

  try {
    const response = await axios.post(`${simulatorUrl}/devices`, {
      devices
    });

    // Register all devices into the registry
    Object.keys(devices).forEach(deviceId => {
      simulatorRegistry.registerSimulator(deviceId, simulatorUrl);
    });

    res.json(response.data)
  } catch (error) {
    console.error(`Error creating multiple devices:`, error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error creating devices',
      details: error.message
    });
  }
})

//Delete existing device
router.post('/device/:id/delete', async (req, res) =>{
  const {id} = req.params;
  const simulatorUrl = simulatorRegistry.getSimulatorUrl(id);

  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/device/${id}/delete`);
    
    // Remove device from registry
    simulatorRegistry.unregisterDevice(id);
    
    res.json(response.data);
  } catch (error) {
    console.error(`Error deleting device ${id}:`, error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error deleting device',
      details: error.message
    });
  }
});

// Get configuration
router.get('/configuration', async (req, res) => {
  try {
    const simulators = await simulatorRegistry.getAllSimulators();
    const configs = {};
    
    for (const simulatorId of simulators) {
      const simulator = await Simulator.findOne({ id: simulatorId });
      if (!simulator || !simulator.url) continue;
      
      try {
        const response = await axios.get(`${simulator.url}/configuration`);
        configs[simulatorId] = response.data;
      } catch (error) {
        console.error(`Error fetching config for ${simulatorId}: ${error.message}`);
      }
    }

    res.json(configs);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
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
    console.error('Error updating configuration:', error.message);
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
    console.error('Error rebooting simulator:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error rebooting simulator',
      details: error.message
    });
  }
});

module.exports = router;