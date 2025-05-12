const axios = require('axios');
const Simulator = require('../models/simulator');
const Device = require('../models/device');
const Room = require('../models/room');
const simulatorRegistry = require('./simulator_registry');

// UUID extraction function (add this if utils/configHelpers doesn't exist yet)
function extractSimulatorUUID(configData) {
  if (!configData || typeof configData !== 'object') return null;
  
  const firstKey = Object.keys(configData)[0];
  if (!firstKey) return null;
  
  const generalConfig = configData[firstKey]?.general;
  if (generalConfig && generalConfig.Id) {
    return generalConfig.Id;
  }
  
  return null;
}

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
        
        try {
          console.log(`Attempting to reach simulator at ${simulator.url}/configuration`);
          const configResponse = await axios.get(`${simulator.url}/configuration`, { timeout: 5000 });
          
          // Extract UUID from configuration
          const uuid = extractSimulatorUUID(configResponse.data);
          
          if (uuid && uuid !== simulator.id) {
            console.log(`Found UUID ${uuid} for simulator currently identified as ${simulator.id}`);
            
            // Update to use UUID
            await Simulator.findOneAndUpdate(
              { id: uuid },
              { 
                url: simulator.url,
                title: simulator.title || 'Simulator',
                status: 'online',
                lastSeen: Date.now()
              },
              { upsert: true }
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
            
            // Delete the old record
            if (simulator.id !== uuid) {
              await Simulator.deleteOne({ id: simulator.id });
              console.log(`Updated simulator ID from ${simulator.id} to ${uuid}`);
              continue;
            }
          }

          console.log(`Successfully reached simulator ${simulator.id} - marking as online`);
          await Simulator.findOneAndUpdate(
            { id: simulator.id },
            { status: 'online', lastSeen: Date.now() }
          );
          
          const updatedSimulator = await Simulator.findOne({ id: simulator.id });
          console.log(`Simulator ${simulator.id} status after update: ${updatedSimulator.status}`);

          // Poll devices
          const devices = await Device.find({ simulatorId: simulator.id });
          
          for (const device of devices) {
            try {
              const response = await axios.get(`${simulator.url}/device/${device.id}`, 
                { timeout: 3000 });
              
              await simulatorRegistry.updateState(device.id, response.data);
            } catch (deviceError) {
              console.error(`Error polling device ${device.id}:`, deviceError.message);
            }
          }

        } catch (simulatorError) {
          console.error(`Error connecting to simulator ${simulator.id}:`, simulatorError.message);
          
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