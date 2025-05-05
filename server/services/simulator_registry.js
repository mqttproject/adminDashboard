const Simulator = require('../models/simulator');
const Device = require('../models/device'); // Schema map to a MongoDB collection
const Room = require('../models/room');

// In-memory cache for recently accessed information
const cache = {
  deviceStates: {}, // For device states caching
  simulatorUrls: {}, // For device ID to simulator URL mapping
  clearCache: function() { // Clears the cache 
    this.deviceStates = {};
    this.simulatorUrls = {};
  }
};

class SimulatorRegistry {

  // Registering a new device with its corresponding simulator
  async registerSimulator(deviceId, url, simulatorId) {
    try {
      // Create/update a simulator
      await Simulator.findOneAndUpdate(
        { id: simulatorId },
        { 
          url,
          lastSeen: Date.now()
        },
        { upsert: true }
      );
      
      // Create/update device(s)
      await Device.findOneAndUpdate(
        { id: deviceId },
        { 
          simulatorId,
          lastUpdated: Date.now()
        },
        { upsert: true }
      );
      
      // Clear relevant cache entries
      delete cache.simulatorUrls[deviceId];
      
      return true;
    } catch (error) {
      console.error('Error registering simulator:', error);
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
      await Device.deleteOne({ id: deviceId });
      
      // Clear from cache
      delete cache.deviceStates[deviceId];
      delete cache.simulatorUrls[deviceId];
      
      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      return false;
    }
  }
}

module.exports = new SimulatorRegistry();