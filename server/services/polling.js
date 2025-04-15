const axios = require('axios');
const Simulator = require('../models/simulator');
const Device = require('../models/device');
const simulatorRegistry = require('./simulator_registry');

class PollingService {
  constructor(interval = 10000) {
    this.interval = interval;
    this.timerId = null;
  }
  
  start() {
    this.timerId = setInterval(() => this.pollAllDevices(), this.interval);
    console.log(`Polling service started, interval: ${this.interval}ms`);
  }
  
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('Polling service stopped');
    }
  }
  
  async pollAllDevices() {
    console.log('Polling all devices...');
    
    try {
      const simulators = await Simulator.find({});
      
      for (const simulator of simulators) {
        // Mark simulator as seen
        await Simulator.updateOne(
          { id: simulator.id },
          { lastSeen: Date.now() }
        );
        
        // Poll each device for this simulator
        const devices = await Device.find({ simulatorId: simulator.id });
        
        for (const device of devices) {
          try {
            const response = await axios.get(`${simulator.url}/device/${device.id}`);
            
            // Update device state in registry
            await simulatorRegistry.updateState(device.id, response.data);
          } catch (error) {
            console.error(`Error polling device ${device.id}:`, error.message);
            
            // If connection fails, mark simulator as offline
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
              await Simulator.updateOne(
                { id: simulator.id },
                { status: 'offline' }
              );
            }
          }
        }
      }
      
      // Update simulators that haven't been seen for a while to offline
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await Simulator.updateMany(
        { lastSeen: { $lt: fiveMinutesAgo } },
        { status: 'offline' }
      );
    } catch (error) {
      console.error('Error in polling service:', error);
    }
  }
}

module.exports = new PollingService();