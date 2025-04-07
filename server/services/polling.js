const axios = require('axios');
const simulatorRegistry = require('./simulator_registry');

class PollingService {
  // Method to poll all simulators every ten seconds (Adjust as necessary)
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
    
    for (const id of simulatorRegistry.getAllSimulators()) {
      const url = simulatorRegistry.getSimulatorUrl(id);
      try {
        const response = await axios.get(`${url}/device/${id}`);
        simulatorRegistry.updateState(id, response.data);
      } catch (error) {
        console.error(`Error polling device ${id}: ${error.message}`);
      }
    }
  }
}

module.exports = new PollingService();