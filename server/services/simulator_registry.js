const Simulator = require('../models/simulator');
const Device = require('../models/device'); // Schema map to a MongoDB collection
const Room = require('../models/room');
const axios = require('axios');
const { extractSimulatorUUID } = require('../utils/configHelpers');

// In-memory cache for recently accessed information
const cache = {
  deviceStates: {}, // For device states caching
  simulatorUrls: {}, // For device ID to simulator URL mapping
};

class SimulatorRegistry {

  clearCache() {
    console.log('Clearing all caches...');
    cache.deviceStates = {};
    cache.simulatorUrls = {};
    console.log('Caches cleared');
  }

  // Helper method to get UUID from simulator configuration
  async getSimulatorUUID(url) {
    try {
      const response = await axios.get(`${url}/configuration`, { timeout: 5000 });
      return extractSimulatorUUID(response.data);
    } catch (error) {
      console.error(`Error fetching UUID from simulator at ${url}:`, error.message);
      return null;
    }
  }

  // Registering a new device with its corresponding simulator
  async registerSimulator(deviceId, url, simulatorId = null) {
    try {
      // Format URL properly
      let formattedUrl = url;
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `http://${formattedUrl}`;
      }
      
      // Try to get UUID from configuration API
      let finalSimulatorId = simulatorId;
      
      try {
        const uuid = await this.getSimulatorUUID(formattedUrl);
        if (uuid) {
          console.log(`Using UUID ${uuid} from configuration for simulator at ${formattedUrl}`);
          finalSimulatorId = uuid;
        } else if (!simulatorId) {
          // Fallback to hostname as before
          const urlObj = new URL(formattedUrl);
          finalSimulatorId = urlObj.hostname;
          console.log(`Using hostname ${finalSimulatorId} as fallback for simulator at ${formattedUrl}`);
        }
      } catch (error) {
        console.warn(`Could not fetch UUID from ${formattedUrl}, using provided ID or hostname:`, error.message);
        if (!finalSimulatorId) {
          const urlObj = new URL(formattedUrl);
          finalSimulatorId = urlObj.hostname;
        }
      }
      
      console.log(`Registering device ${deviceId} with simulator ${finalSimulatorId} at ${formattedUrl}`);
      
      // Create/update simulator
      const updateResult = await Simulator.findOneAndUpdate(
        { id: finalSimulatorId },
        { 
          url: formattedUrl,
          lastSeen: Date.now(),
          status: 'online'
        },
        { 
          upsert: true,
          new: true
        }
      );
      
      // Create/update device
      await Device.findOneAndUpdate(
        { id: deviceId },
        { 
          simulatorId: finalSimulatorId,
          lastUpdated: Date.now()
        },
        { 
          upsert: true,
          new: true 
        }
      );
      
      // Clear cache entries
      delete cache.simulatorUrls[deviceId];
      
      return true;
    } catch (error) {
      console.error(`Error registering simulator for device ${deviceId}:`, error);
      return false;
    }
  }
  
  // Get the URL for a specific device's simulator
  async getSimulatorUrl(deviceId) {
    // Checking the cache first
    if (cache.simulatorUrls[deviceId]) {
      return cache.simulatorUrls[deviceId];
    }
    
    try {
      const device = await Device.findOne({ id: deviceId });
      if (!device) return null;
      
      const simulator = await Simulator.findOne({ id: device.simulatorId });
      if (!simulator) return null;
      
      // Cache the result
      cache.simulatorUrls[deviceId] = simulator.url;
      
      return simulator.url;
      
    } catch (error) {
      console.error('Error getting simulator URL:', error);
      return null;
    }
  }
  
  // Update the state of a device
  async updateState(deviceId, state) {
    try {
      const updateData = {
        lastUpdated: Date.now()
      };
      
      // Add any properties from state that we want to save
      if (state.on !== undefined) updateData.on = state.on;
      if (state.rebooting !== undefined) updateData.rebooting = state.rebooting;
      if (state.action) updateData.action = state.action;
      if (state.broker) updateData.broker = state.broker;
      
      await Device.findOneAndUpdate(
        { id: deviceId },
        updateData
      );
      
      // Update cache
      cache.deviceStates[deviceId] = {
        ...state,
        lastUpdated: Date.now()
      };
      
      return true;
    } catch (error) {
      console.error('Error updating device state:', error);
      return false;
    }
  }
  
  // Get the state of a specific device
  async getState(deviceId) {
    // Check the cache first
    if (cache.deviceStates[deviceId]) {
      return cache.deviceStates[deviceId];
    }
    
    try {
      const device = await Device.findOne({ id: deviceId });
      
      if (device) {
        // Cache the result
        cache.deviceStates[deviceId] = {
          on: device.on,
          rebooting: device.rebooting,
          action: device.action,
          broker: device.broker,
          lastUpdated: device.lastUpdated
        };

        return cache.deviceStates[deviceId];
      }
      return null;
    } catch (error) {
      console.error('Error getting device state:', error);
      return null;
    }
  }
  
  // Get states of all devices
  async getAllStates() {
    try {
      const devices = await Device.find({});
      
      const states = {};
      devices.forEach(device => {
        states[device.id] = {
          on: device.on,
          rebooting: device.rebooting,
          action: device.action,
          broker: device.broker,
          lastUpdated: device.lastUpdated
        };
      });
      
      // Refresh the cache
      cache.deviceStates = states;
      
      return states;
    } catch (error) {
      console.error('Error getting all device states:', error);
      return {};
    }
  }
  
  // Get IDs of all simulators
  async getAllSimulators() {
    try {
      const simulators = await Simulator.find({});
      return simulators.map(simulator => simulator.id);
    } catch (error) {
      console.error('Error getting all simulators:', error);
      return [];
    }
  }
  
  // Get all simulators with their devices
  async getAllSimulatorsWithDevices() {
    try {
      const simulators = await Simulator.find({});
      const result = [];
      
      for (const simulator of simulators) {
        const devices = await Device.find({ simulatorId: simulator.id });
        
        result.push({
          id: simulator.id,
          url: simulator.url,
          title: simulator.title,
          status: simulator.status,
          devices: devices.map(d => ({
            id: d.id,
            on: d.on,
            action: d.action,
            broker: d.broker
          }))
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting simulators with devices:', error);
      return [];
    }
  }
  
  // Mark all devices from a simulator as rebooting
  async markSimulatorRebooting(url) {
    try {
      // Find the simulator by URL
      const simulator = await Simulator.findOne({ url });
      if (!simulator) return false;
      
      // Update all devices of that simulator
      await Device.updateMany(
        { simulatorId: simulator.id },
        { on: false, rebooting: true, lastUpdated: Date.now() }
      );
      
      // Clear device states cache
      cache.deviceStates = {};
      
      // Set a timeout to clear the rebooting flag
      setTimeout(async () => {
        try {
          await Device.updateMany(
            { simulatorId: simulator.id, rebooting: true },
            { rebooting: false }
          );
          // Clear cache again
          cache.deviceStates = {};
        } catch (err) {
          console.error('Error clearing reboot flag:', err);
        }
      }, 15000); // 15 second reboot period
      
      return true;
    } catch (error) {
      console.error('Error marking simulator as rebooting:', error);
      return false;
    }
  }
  
  // Get all devices for a specific simulator
  async getDevicesForSimulator(url) {
    try {
      const simulator = await Simulator.findOne({ url });
      if (!simulator) return [];
      
      const devices = await Device.find({ simulatorId: simulator.id });
      return devices.map(d => d.id);
    } catch (error) {
      console.error('Error getting devices for simulator:', error);
      return [];
    }
  }
  
  // Remove a device
  async unregisterDevice(deviceId) {
    try {
      console.log(`Unregistering device ${deviceId} from database`);
      
      // Perform database deletion
      const deleteResult = await Device.deleteOne({ id: deviceId });
      
      console.log(`Delete result for ${deviceId}:`, deleteResult);
      
      // Verify deletion was successful
      if (deleteResult.deletedCount === 0) {
        console.warn(`No device found with ID ${deviceId} to delete`);
      } else {
        console.log(`Successfully deleted device ${deviceId} from database`);
      }
      
      // Clear from cache
      delete cache.deviceStates[deviceId];
      delete cache.simulatorUrls[deviceId];
      
      return deleteResult.deletedCount > 0;
    } catch (error) {
      console.error(`Error unregistering device ${deviceId}:`, error);
      return false;
    }
  }
}

module.exports = new SimulatorRegistry();