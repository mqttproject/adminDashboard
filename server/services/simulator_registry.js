class SimulatorRegistry {
  constructor() {
    this.simulators = {}; // Map of simulator ID to URL
    this.states = {};     // Cache of simulator states
    this.urlToDevices = {}; // Map of simulator URL to device IDs
  }
  
  registerSimulator(deviceId, url) {
    this.simulators[deviceId] = url;
    
    // Track which devices belong to which simulator URL
    if (!this.urlToDevices[url]) {
      this.urlToDevices[url] = [];
    }
    if (!this.urlToDevices[url].includes(deviceId)) {
      this.urlToDevices[url].push(deviceId);
    }
  }
  
  getSimulatorUrl(deviceId) {
    return this.simulators[deviceId];
  }
  
  updateState(deviceId, state) {
    this.states[deviceId] = {
      ...state,
      lastUpdated: Date.now()
    };
  }
  
  getState(deviceId) {
    return this.states[deviceId];
  }
  
  getAllStates() {
    return this.states;
  }
  
  getAllSimulators() {
    return Object.keys(this.simulators);
  }
  
  markSimulatorRebooting(url) {
    // Find all devices for this simulator URL
    const deviceIds = this.urlToDevices[url] || [];
    
    // Mark devices as rebooting
    const now = Date.now();
    deviceIds.forEach(deviceId => {
      this.states[deviceId] = {
        ...this.states[deviceId],
        on: false,
        rebooting: true,
        lastUpdated: now
      };
    });
    
    // Set a timeout to clear the rebooting flag after a reasonable time
    setTimeout(() => {
      deviceIds.forEach(deviceId => {
        if (this.states[deviceId]?.rebooting) {
          this.states[deviceId] = {
            ...this.states[deviceId],
            rebooting: false
          };
        }
      });
    }, 60000); // Assuming reboot takes up to a minute
  }
}

module.exports = new SimulatorRegistry();