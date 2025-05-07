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
    
    console.log(`Checking simulator ${simulator.id} at ${simulator.url}`);
    
    try {
      // Just check if the simulator is reachable
      try {
        await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
        
        // Update simulator to online if reachable
        await Simulator.findOneAndUpdate(
          { id: simulator.id },
          { 
            lastSeen: Date.now(),
            status: 'online'
          }
        );
        
        console.log(`Simulator ${simulator.id} is online`);
      } catch (error) {
        console.error(`Simulator ${simulator.id} appears to be offline:`, error.message);
        
        // Update simulator to offline
        await Simulator.findOneAndUpdate(
          { id: simulator.id },
          { status: 'offline' }
        );
      }
    } catch (error) {
      console.error(`Error checking simulator ${simulator.id}:`, error);
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