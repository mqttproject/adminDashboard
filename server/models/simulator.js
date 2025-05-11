const mongoose = require('mongoose');

const simulatorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID from config
  url: { type: String, required: true }, // Callback URL provided during registration
  title: { type: String, default: 'Simulator' },
  status: { type: String, default: 'offline', enum: ['online', 'offline', 'rebooting'] },
  lastSeen: { type: Date, default: Date.now },
  config: { type: mongoose.Schema.Types.Mixed }, // Full configuration data
  token: { type: String }, // Authentication token (hash this in production)
  registeredAt: { type: Date, default: Date.now },
  configuration: { type: mongoose.Schema.Types.Mixed } // Store full config from registration
});

module.exports = mongoose.model('Simulator', simulatorSchema);