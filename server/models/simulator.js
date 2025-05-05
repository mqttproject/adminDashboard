const mongoose = require('mongoose');

const simulatorSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // UUID from config
  url: { type: String }, // Callback URL provided during registration
  title: { type: String, default: 'Simulator' },
  status: { type: String, default: 'offline', enum: ['offline', 'offline', 'rebooting', 'awaiting'] },
  owner: { type: String,ref: 'User' },
  devices: [{ type: String, ref: 'Device' }],
  lastSeen: { type: Date, default: Date.now },
  expectedToken:{ type: String, default: null },
  config: { type: mongoose.Schema.Types.Mixed }, // Full configuration data
  expectedToken: { type: String, default: null }, // Authentication token (hash this in production)
  registeredAt: { type: Date, default: Date.now },
  configuration: { type: mongoose.Schema.Types.Mixed } // Store full config from registration
});

module.exports = mongoose.model('Simulator', simulatorSchema);