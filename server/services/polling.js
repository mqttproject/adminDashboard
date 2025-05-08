const axios = require('axios');
const Simulator = require('../models/simulator');
const Device = require('../models/device');
const simulatorRegistry = require('./simulator_registry');

class PollingService {
  constructor(interval = 5000) {
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

        console.log(`Polling simulator ${simulator.id} at URL: ${simulator.url}`);
        // Mark simulator as seen
        await Simulator.findOneAndUpdate(
          { id: simulator.id },
          { lastSeen: Date.now() }
        );
        
        try {
          console.log(`Attempting to reach simulator at ${simulator.url}/configuration`);
          // Check if the simulator is reachable
          await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
          
          console.log(`Successfully reached simulator ${simulator.id} - marking as online`);
          // If reachable => update status to online
          await Simulator.findOneAndUpdate(
            { id: simulator.id },
            { status: 'online', lastSeen: Date.now() }
          );
          
          // Check if status was updated
          const updatedSimulator = await Simulator.findOne({ id: simulator.id });
          console.log(`Simulator ${simulator.id} status after update: ${updatedSimulator.status}`);

          // Poll each device for this particular simulator
          const devices = await Device.find({ simulatorId: simulator.id });
          
          for (const device of devices) {
            try {
              const response = await axios.get(`${simulator.url}/device/${device.id}`, 
                { timeout: 3000 });
              
              // Update device state in registry
              await simulatorRegistry.updateState(device.id, response.data);
            } catch (deviceError) {
              console.error(`Error polling device ${device.id}:`, deviceError.message);
            }
          }
        } catch (simulatorError) {
          console.error(`Error connecting to simulator ${simulator.id}:`, simulatorError.message);
          
          // Mark simulator as offline
          await Simulator.findOneAndUpdate(
            { id: simulator.id },
            { status: 'offline' }
          );
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