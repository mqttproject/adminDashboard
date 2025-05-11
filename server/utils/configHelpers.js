/**
 * Extracts the simulator UUID from a configuration response
 * @param {Object} configData - The configuration data returned from a simulator
 * @returns {string|null} - The extracted UUID or null if not found
 */
function extractSimulatorUUID(configData) {
    // The configuration has the format { "IP_ADDRESS": { "general": { "Id": "UUID" }, ... } }
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
}
  
  /**
   * Extracts device information from a configuration response
   * @param {Object} configData - The configuration data returned from a simulator
   * @returns {Array} - Array of device objects with id, action, and broker properties
   */
function extractDevicesFromConfig(configData) {
    if (!configData || typeof configData !== 'object') return [];
    
    // Get the first key (IP address)
    const firstKey = Object.keys(configData)[0];
    if (!firstKey) return [];
    
    // Extract the devices section
    const devicesConfig = configData[firstKey]?.devices;
    if (!devicesConfig || typeof devicesConfig !== 'object') return [];
    
    // Transform the devices into an array format
    return Object.entries(devicesConfig).map(([deviceKey, deviceData]) => ({
      id: deviceData.Id || deviceKey,
      action: deviceData.Action || null,
      broker: deviceData.Broker || null
    }));
}
  
  module.exports = {
    extractSimulatorUUID,
    extractDevicesFromConfig
  };