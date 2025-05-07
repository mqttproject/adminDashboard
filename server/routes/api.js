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

  try {
    console.log(`Getting device info for: ${id}`);
    const simulatorUrl = await simulatorRegistry.getSimulatorUrl(id);
    console.log(`Retrieved simulator URL: ${simulatorUrl}`)
  
    if (!simulatorUrl) {
      return res.status(404).json({ error: 'Device not found' });
    }

    //Ensuring URL is properly formatted 
    let formattedUrl = simulatorUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}`;
    }

    console.log(`Making request to: ${formattedUrl}/device/${id}`);

    const response = await axios.get(`${formattedUrl}/device/${id}`);
    await simulatorRegistry.updateState(id, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching device ${id}:`, error);
    res.status(500).json({
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
  
  try {
    // First check if the device already exists on the simulator
    const checkUrl = `${simulatorUrl}/device/${id}`;
    console.log(`Checking if device exists: ${checkUrl}`);
    
    let deviceExists = false;
    try {
      await axios.get(checkUrl);
      deviceExists = true;
      console.log(`Device ${id} already exists on simulator`);
    } catch (checkError) {
      // If 404, device doesn't exist
      if (checkError.response && checkError.response.status === 404) {
        deviceExists = false;
        console.log(`Device ${id} does not exist on simulator`);
      } else {
        // For other errors, we're uncertain
        console.warn(`Error checking device existence: ${checkError.message}`);
      }
    }
    
    // If device doesn't exist, create it on the simulator
    if (!deviceExists) {
      console.log(`Attempting to create device ${id} on simulator`);
      try {
        await axios.post(`${simulatorUrl}/device/${id}`, {
          action,
          broker
        });
        console.log(`Device ${id} created successfully on simulator`);
      } catch (createError) {
        console.error(`Error creating device ${id} on simulator: ${createError.message}`);
        
        // If this fails with 400, it might already exist despite our check
        if (!(createError.response && createError.response.status === 400)) {
          return res.status(createError.response?.status || 500).json({
            error: `Error creating device ${id}`,
            details: createError.message
          });
        }
      }
    }
    
    // Register in our database regardless, as the synchronization is supposed to handle any discrepancies
    console.log(`Registering device ${id} in database`);
    await simulatorRegistry.registerSimulator(id, simulatorUrl);
    
    res.json({ success: true, message: deviceExists ? "Device already exists" : "Device created" });
  } catch (error) {
    console.error(`Error in device creation flow for ${id}:`, error.message);
    res.status(error.response?.status || 500).json({
      error: `Error creating device ${id}`,
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
router.post('/device/:id/delete', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Processing deletion request for device ${id}`);
    const simulatorUrl = await simulatorRegistry.getSimulatorUrl(id);
    
    if (!simulatorUrl) {
      console.warn(`Device ${id} not found in database, attempting deletion anyway`);
      
      // Try to delete from database even if not found
      const deleteResult = await Device.deleteOne({ id: id });
      console.log(`Database deletion result:`, deleteResult);
      
      return res.status(404).json({ 
        warning: 'Device not found in database',
        databaseDeletion: deleteResult.deletedCount > 0 ? 'successful' : 'not needed'
      });
    }
    
    console.log(`Found simulator URL for device ${id}: ${simulatorUrl}`);
    
    // First attempt to delete from simulator
    try {
      const response = await axios.post(`${simulatorUrl}/device/${id}/delete`);
      console.log(`Simulator deletion response for ${id}:`, response.data);
    } catch (simError) {
      console.error(`Error deleting device ${id} from simulator:`, simError.message);
      // Continue with database deletion even if simulator deletion fails
    }
    
    // Then ensure removal from database
    console.log(`Removing device ${id} from database`);
    const deleteResult = await Device.deleteOne({ id: id });
    console.log(`Database deletion result:`, deleteResult);
    
    if (deleteResult.deletedCount === 0) {
      console.warn(`Device ${id} was not found in database for deletion`);
    } else {
      console.log(`Successfully deleted device ${id} from database`);
    }
    
    res.json({ 
      message: "Device deletion processed",
      simulatorDeletion: "attempted",
      databaseDeletion: deleteResult.deletedCount > 0 ? "successful" : "not needed"
    });
  } catch (error) {
    console.error(`Error in device deletion flow for ${id}:`, error);
    
    // Try to delete from database anyway
    try {
      const deleteResult = await Device.deleteOne({ id: id });
      console.log(`Emergency database cleanup result:`, deleteResult);
    } catch (dbError) {
      console.error(`Failed emergency database cleanup:`, dbError);
    }
    
    res.status(500).json({
      error: 'Error deleting device',
      details: error.message,
      note: "Database cleanup was attempted regardless"
    });
  }
});

// Synchronize DB
router.post('/sync/:simulatorId?', async (req, res) => {
  try {
    const { simulatorId } = req.params;
    
    if (simulatorId) {
      // Sync specific simulator
      await syncService.syncSimulator(simulatorId);
      res.json({ success: true, message: `Synchronized simulator ${simulatorId}` });
    } else {
      // Sync all simulators
      syncService.syncAllSimulators();
      res.json({ success: true, message: 'Synchronization started for all simulators' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Synchronization failed',
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