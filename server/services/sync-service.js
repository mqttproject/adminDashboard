const Simulator = require('../models/simulator');
const Device = require('../models/device');
const axios = require('axios');
const simulatorRegistry = require('./simulator_registry')

class SyncService {
  constructor(interval = 10000) { // Default: sync every minute
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
    
    try {
      // Get devices from simulator
      let devicesList = [];
      try {
        const response = await axios.get(`${simulator.url}/devices`, { timeout: 5000 });
        const devicesData = response.data || {};
        
        // Transform from object with keys to array with id property
        devicesList = Object.keys(devicesData).map(deviceId => ({
          id: deviceId,
          on: devicesData[deviceId].on || false,
          rebooting: devicesData[deviceId].rebooting || false,
          action: devicesData[deviceId].action || null,
          broker: devicesData[deviceId].broker || null
        }));
        
        console.log(`Parsed ${devicesList.length} devices from simulator:`, 
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
      
      console.log('Simulator devices:', Array.from(simulatorDeviceIds));
      console.log('Database devices:', Array.from(dbDeviceIds));
      
      // Find devices to add to MongoDB (exist in simulator but not in DB)
      for (const device of devicesList) {
        if (!dbDeviceIds.has(device.id)) {
          console.log(`Adding device ${device.id} to database`);
          
          // Add to MongoDB
          await Device.create({
            id: device.id,
            simulatorId: simulator.id,
            action: device.action,
            broker: device.broker,
            on: device.on,
            rebooting: device.rebooting,
            lastUpdated: Date.now()
          });
          
          console.log(`Added device ${device.id} to database`);
        } else {
          // Update existing device
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
      for (const device of dbDevices) {
        if (!simulatorDeviceIds.has(device.id)) {
          console.log(`Removing device ${device.id} from database`);
          
          const deleteResult = await Device.deleteOne({ id: device.id });
          console.log(`Delete result for ${device.id}:`, deleteResult);
        }
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
}

module.exports = new SyncService();