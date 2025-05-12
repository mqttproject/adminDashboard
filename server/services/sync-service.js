const Simulator = require('../models/simulator');
const Device = require('../models/device');
const axios = require('axios');
const simulatorRegistry = require('./simulator_registry')

class SyncService {
  constructor(interval = 7000) { // Default: sync every minute
    this.interval = interval;
    this.timerId = null;
  }
  
  start() {
    this.timerId = setInterval(() => this.syncAllSimulators(), this.interval);
    console.log(`Device synchronization service started, interval: ${this.interval}ms`);
  }
  
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('Device synchronization service stopped');
    }
  }
  
  async syncAllSimulators() {
    console.log('Starting synchronization with all simulators...');
    
    try {
      const simulators = await Simulator.find({});
      console.log(`Found ${simulators.length} simulators to sync`);
      
      for (const simulator of simulators) {
        try {
          await this.syncSimulatorDevices(simulator);
        } catch (error) {
          console.error(`Failed to sync simulator ${simulator.id}:`, error.message);
        }
      }
      
      // Clear cache after synchronization
      simulatorRegistry.clearCache();
      console.log('Cache cleared after synchronization');
      
      console.log('Synchronization completed');
    } catch (error) {
      console.error('Error during synchronization:', error);
    }
  }
  
  async syncSimulatorDevices(simulator) {
    if (!simulator || !simulator.id) {
      console.error('Invalid simulator object:', simulator);
      return;
    }
    
    if (!simulator.url) {
      console.warn(`Simulator ${simulator.id} has no URL, skipping sync`);
      return;
    }
    
    console.log(`Syncing devices for simulator ${simulator.id} at ${simulator.url}`);
    
    // Attempt getting UUID from /configuration
    const uuid = await this.extractSimulatorUUIDFromConfig(simulator);
  
    // If UUID is found and is different from current ID, update the simulator ID
    if (uuid && uuid !== simulator.id) {
      console.log(`Found UUID ${uuid} for simulator currently identified as ${simulator.id}`);
      
      try {
        // Create/update a simulator with UUID
        const updatedSimulator = await Simulator.findOneAndUpdate(
          { id: uuid },
          { 
            url: simulator.url,
            title: simulator.title || 'Simulator',
            status: 'online',
            lastSeen: Date.now()
          },
          { upsert: true, new: true }
        );
        
        // Update device references
        await Device.updateMany(
          { simulatorId: simulator.id },
          { simulatorId: uuid }
        );
        
        // Update room references
        await Room.updateMany(
          { simulatorIds: simulator.id },
          { $pull: { simulatorIds: simulator.id } }
        );
        
        await Room.updateMany(
          { },
          { $addToSet: { simulatorIds: uuid } }
        );
        
        // Delete the old record if it's different
        if (simulator.id !== uuid) {
          await Simulator.deleteOne({ id: simulator.id });
          console.log(`Updated simulator ID from ${simulator.id} to ${uuid}`);
          
          // Update the simulator reference for the rest of this function
          simulator = updatedSimulator;
        }
      } catch (error) {
        console.error(`Error updating simulator ID:`, error);
      }
    }

    try {
      // Get devices from simulator
      let devicesList = [];
      try {
        console.log(`Fetching devices from ${simulator.url}/devices`);
        const response = await axios.get(`${simulator.url}/devices`, { timeout: 5000 });
        const responseData = response.data || {};
        
        console.log(`Raw response from simulator:`, JSON.stringify(responseData).substring(0, 200) + '...');
        
        // Check if response has the expected nested 'devices' object
        if (responseData.devices && typeof responseData.devices === 'object') {
          const devicesObj = responseData.devices;
          console.log(`Found ${Object.keys(devicesObj).length} devices in nested 'devices' object`);
          
          // Transform each device in the nested devices object to our format
          devicesList = Object.entries(devicesObj).map(([key, device]) => ({
            id: device.id || key,
            on: device.on || false,
            rebooting: device.rebooting || false,
            action: device.action || null,
            broker: device.broker || null
          }));
        } else {
          console.warn(`Unexpected response format from /devices endpoint - no 'devices' object found`);
          // Try to handle as direct map of device IDs to devices
          devicesList = Object.entries(responseData).map(([key, device]) => ({
            id: device.id || key,
            on: device.on || false,
            rebooting: device.rebooting || false,
            action: device.action || null,
            broker: device.broker || null
          }));
        }
        
        console.log(`Transformed ${devicesList.length} devices from simulator ${simulator.id}:`, 
                   devicesList.map(d => d.id).join(', '));
                   
        // Update simulator to online if reachable
        await Simulator.findOneAndUpdate(
          { id: simulator.id },
          {
            lastSeen: Date.now(),
            status: 'online'
          }
        );
      } catch (error) {
        console.error(`Error fetching devices from simulator ${simulator.id}:`, error.message);
        
        console.warn(`🚨 GRACEFUL DEGRADATION: Unable to fetch devices from simulator ${simulator.id}.`);
        console.warn(`🔄 System will use existing database entries as a temporary fallback.`);
        console.warn(`⚠️ WARNING: This creates a circular reference where the database becomes its own source of truth.`);
        console.warn(`📝 NOTE: To fix this, ensure the simulator at ${simulator.url} has a working /devices endpoint, as that is used as *THE* source of truth.`);

        // Update simulator to offline
        await Simulator.findOneAndUpdate(
          { id: simulator.id },
          { status: 'offline' }
        );
        return;
      }
      
      // Fetch devices from MongoDB for this simulator
      const dbDevices = await Device.find({ simulatorId: simulator.id });
      console.log(`Database has ${dbDevices.length} devices for simulator ${simulator.id}`);
      
      // Create sets of device IDs for comparison
      const simulatorDeviceIds = new Set(devicesList.map(d => d.id));
      const dbDeviceIds = new Set(dbDevices.map(d => d.id));
      
      console.log('Simulator device IDs:', Array.from(simulatorDeviceIds));
      console.log('Database device IDs:', Array.from(dbDeviceIds));
      
      // Find devices to add to MongoDB (exist in simulator but not in DB)
      for (const device of devicesList) {
  if (!dbDeviceIds.has(device.id)) {
    console.log(`Adding device ${device.id} to database`);
    
    try {
      // First, check if the device exists with a different simulator ID
      const existingDevice = await Device.findOne({ id: device.id });
      
      if (existingDevice) {
        console.log(`Device ${device.id} already exists with simulator ${existingDevice.simulatorId}`);
        console.log(`Updating to new simulator ${simulator.id}`);
        
        // Update the existing device to point to the new simulator
        await Device.findOneAndUpdate(
          { id: device.id },
          {
            simulatorId: simulator.id,
            action: device.action,
            broker: device.broker,
            on: device.on,
            rebooting: device.rebooting,
            lastUpdated: Date.now()
          }
        );
      } else {
        // Create new device
        await Device.create({
          id: device.id,
          simulatorId: simulator.id,
          action: device.action,
          broker: device.broker,
          on: device.on,
          rebooting: device.rebooting,
          lastUpdated: Date.now()
        });
      }
      
      console.log(`Successfully handled device ${device.id}`);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - update existing device
        console.log(`Device ${device.id} already exists, updating...`);
        await Device.findOneAndUpdate(
          { id: device.id },
          {
            simulatorId: simulator.id,
            action: device.action,
            broker: device.broker,
            on: device.on,
            rebooting: device.rebooting,
            lastUpdated: Date.now()
          }
        );
      } else {
        console.error(`Error adding device ${device.id}:`, error);
      }
    }
    } else {
      // Update existing device
      console.log(`Updating device ${device.id} in database`);
      await Device.findOneAndUpdate(
        { id: device.id },
        {
          on: device.on,
          rebooting: device.rebooting,
          action: device.action,
          broker: device.broker,
          lastUpdated: Date.now()
        }
      );
    }
  }
      
      // Find devices to remove from MongoDB (exist in DB but not in simulator)
      let devicesToRemove = [];
      for (const device of dbDevices) {
        // Make sure we're not removing the 'devices' pseudo-device
        if (!simulatorDeviceIds.has(device.id) && device.id !== 'devices') {
          devicesToRemove.push(device.id);
        }
      }
      
      if (devicesToRemove.length > 0) {
        console.log(`Removing ${devicesToRemove.length} devices from database that don't exist in simulator ${simulator.id}`);
        console.log(`Devices to remove:`, devicesToRemove);
        
        for (const deviceId of devicesToRemove) {
          try {
            const deleteResult = await Device.deleteOne({ id: deviceId });
            console.log(`Delete result for ${deviceId}:`, deleteResult);
          } catch (deleteError) {
            console.error(`Error deleting device ${deviceId}:`, deleteError);
          }
        }
      } else {
        console.log(`No devices to remove for simulator ${simulator.id}`);
      }
      
      // Clean up any 'devices' pseudo-devices that might have been created
      const devicesCleanup = await Device.deleteOne({ id: 'devices' });
      if (devicesCleanup.deletedCount > 0) {
        console.log(`Cleaned up incorrect 'devices' pseudo-device entry`);
      }
      
      console.log(`Successfully synchronized devices for simulator ${simulator.id}`);
    } catch (error) {
      console.error(`Error synchronizing devices for simulator ${simulator.id}:`, error);
    }
  }
  
  // Manual sync for a specific simulator
  async syncSimulator(simulatorId) {
    const simulator = await Simulator.findOne({ id: simulatorId });
    if (!simulator) {
      throw new Error(`Simulator with ID ${simulatorId} not found`);
    }
    
    await this.syncSimulatorDevices(simulator);
    return true;
  }

  // Sim UUID extractor function to avoid using IP as identifier
  async extractSimulatorUUIDFromConfig(simulator) {
    try {
      // Get configuration from simulator
      const response = await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
      const configData = response.data;
      
      // Extract UUID using the same helper function
      if (!configData || typeof configData !== 'object') return null;
      
      // Get the first key (IP address)
      const firstKey = Object.keys(configData)[0];
      if (!firstKey) return null;
      
      // Extract the UUID from the general section
      const generalConfig = configData[firstKey]?.general;
      if (generalConfig && generalConfig.Id) {
        return generalConfig.Id;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching UUID from simulator ${simulator.id}:`, error.message);
      return null;
    }
  }
}

module.exports = new SyncService();