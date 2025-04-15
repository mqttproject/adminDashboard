const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  simulatorId: { type: String, required: true },
  action: { type: String },
  broker: { type: String },
  on: { type: Boolean, default: false },
  rebooting: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', deviceSchema);