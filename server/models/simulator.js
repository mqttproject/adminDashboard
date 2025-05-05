const mongoose = require('mongoose');

const simulatorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  title: { type: String, default: 'Simulator' },
  status: { type: String, default: 'offline', enum: ['online', 'offline', 'rebooting'] },
  lastSeen: { type: Date, default: Date.now },
  config: { type: mongoose.Schema.Types.Mixed } // For storing simulator configuration data
});

module.exports = mongoose.model('Simulator', simulatorSchema);