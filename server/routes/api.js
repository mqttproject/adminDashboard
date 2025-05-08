// server/routes/api.js
const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth_mw');
const simulatorRegistry = require('../services/simulator_registry');
const Simulator = require('../models/simulator');

const router = express.Router();

// Apply authentication middleware to all routes 
router.use(authenticate);

// ========== DEVICE ROUTES ==========

// Delete device
router.post('/device/:id/delete', async (req, res) => {
  const {id} = req.params;
  const simulatorUrl = await simulatorRegistry.getSimulatorUrl(id);

  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/device/${id}/delete`);
    
    // Remove device from registry
    await simulatorRegistry.unregisterDevice(id);
    
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error deleting device',
      details: error.message
    });
  }
});

// Device on
router.post('/device/:id/on', async (req, res) => {
  const { id } = req.params;
  const simulatorUrl = await simulatorRegistry.getSimulatorUrl(id);
  
  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/device/${id}/on`);
    
    // Update cache after control action
    setTimeout(async () => {
      try {
        const statusResponse = await axios.get(`${simulatorUrl}/device/${id}`);
        await simulatorRegistry.updateState(id, statusResponse.data);
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

// Device off
router.post('/device/:id/off', async (req, res) => {
  const { id } = req.params;
  const simulatorUrl = await simulatorRegistry.getSimulatorUrl(id);
  
  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/device/${id}/off`);
    
    // Update cache after control action
    setTimeout(async () => {
      try {
        const statusResponse = await axios.get(`${simulatorUrl}/device/${id}`);
        await simulatorRegistry.updateState(id, statusResponse.data);
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

// Get device data
router.get('/device/:id', async (req, res) => {
  const { id } = req.params;
  const simulatorUrl = await simulatorRegistry.getSimulatorUrl(id);
  
  if (!simulatorUrl) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  try {
    const response = await axios.get(`${simulatorUrl}/device/${id}`);
    await simulatorRegistry.updateState(id, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error communicating with device',
      details: error.message
    });
  }
});

// Register new device
router.post('/device/:id', async (req, res) => {
  const { id } = req.params;
  const { action, broker, simulatorUrl, simulatorId } = req.body;
  
  if (!simulatorUrl) {
    return res.status(400).json({ error: 'Simulator URL is required' });
  }
  
  // Register in our registry
  await simulatorRegistry.registerSimulator(id, simulatorUrl, simulatorId);
  
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


// Get all devices
router.get('/devices', async (req, res) => {
  try {
    const states = await simulatorRegistry.getAllStates();

    // Check if simulator's are offline
    const offlineSimulators = await Simulator.find({ status: 'offline' });
    
    let responseData = {
      devices: states
    };
    
    // Add warnings if needed
    if (offlineSimulators.length > 0) {
      responseData.warnings = {
        graceful_degradation: true,
        offline_simulators: offlineSimulators.map(s => s.id),
        message: "Some simulators are offline. Device data may be stale or incomplete."
      };
    }
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device states' });
  }
});

// Register multiple devices
router.post('/devices', async (req, res) => {
  const { simulatorUrl, devices, simulatorId } = req.body;

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
    Object.keys(devices).forEach(deviceKey => {
      const deviceId = devices[deviceKey].id;
      simulatorRegistry.registerSimulator(deviceId, simulatorUrl, simulatorId);
    });

    res.json(response.data)
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error creating devices',
      details: error.message
    });
  }
});

// ========== CONFIGURATION ROUTES ==========

// GET current configuration
router.get('/configuration', async (req, res) => {
  try {
    const simulators = await Simulator.find({});
    console.log(`Found ${simulators.length} simulators in database`);
    
    if (simulators.length === 0) {
      return res.json({ message: "No simulators found in database" });
    }
    
    const configs = {};
    let configFound = false;
    
    for (const simulator of simulators) {
      if (!simulator || !simulator.url) {
        console.log(`Skipping simulator with ID ${simulator?.id} - missing URL`);
        continue;
      }
      
      console.log(`Fetching configuration from simulator ${simulator.id} at ${simulator.url}`);
      
      try {
        const response = await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
        console.log(`Received response from ${simulator.url}/configuration:`, response.status);
        console.log(`Response data structure:`, Object.keys(response.data));
        
        // Store the configuration data
        if (response.data && Object.keys(response.data).length > 0) {
          configs[simulator.id] = response.data;
          configFound = true;
          console.log(`Added configuration for simulator ${simulator.id}`);
        } else {
          console.log(`Received empty configuration from ${simulator.url}`);
        }
      } catch (error) {
        console.error(`Error fetching config for ${simulator.id}: ${error.message}`);
        
        if (error.response) {
          console.error(`Status: ${error.response.status}, Data:`, error.response.data);
        } else if (error.request) {
          console.error(`No response received from ${simulator.url}`);
        }
      }
    }
    
    console.log(`Returning configuration data for ${Object.keys(configs).length} simulators`);
    
    // If no configurations were found, provide a helpful message
    if (!configFound) {
      return res.json({ 
        message: "Could not retrieve configurations from any simulators",
        simulatorCount: simulators.length
      });
    }
    
    res.json(configs);
  } catch (error) {
    console.error('Error in GET /configuration:', error);
    res.status(500).json({ 
      error: 'Failed to fetch configurations',
      details: error.message 
    });
  }
});

// Update /configuration
router.post('/configuration', async (req, res) => {
  const { simulatorUrl, config } = req.body;
  
  if (!simulatorUrl) {
    return res.status(400).json({ error: 'Simulator URL is required' });
  }
  
  try {
    // For now use the hostname as the ID
    const hostname = new URL(simulatorUrl).hostname;
    
    // Get or create the simulator
    let simulator = await Simulator.findOne({ url: simulatorUrl });
    if (!simulator) {
      simulator = new Simulator({
        id: hostname,
        url: simulatorUrl,
        title: 'Simulator',
        status: 'online',
        lastSeen: Date.now()
      });
      await simulator.save();
    }
    
    // Make the API call to the simulator
    const response = await axios.post(`${simulatorUrl}/configuration`, config);
    
    // Update simulator registry with any new devices
    if (config.devices) {
      for (const deviceKey in config.devices) {
        const device = config.devices[deviceKey];
        await simulatorRegistry.registerSimulator(device.id || deviceKey, simulatorUrl, simulator.id);
      }
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error updating configuration',
      details: error.message
    });
  }
});

// ========== SYSTEM ROUTES ==========
router.post('/reboot', async (req, res) => {
  const { simulatorUrl } = req.body;
  
  if (!simulatorUrl) {
    return res.status(400).json({ error: 'Simulator URL is required' });
  }
  
  try {
    const response = await axios.post(`${simulatorUrl}/reboot`);
    
    // Mark all devices from this simulator as potentially offline
    await simulatorRegistry.markSimulatorRebooting(simulatorUrl);
    
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Error rebooting simulator',
      details: error.message
    });
  }
});

module.exports = router;