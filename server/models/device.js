const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  simulatorId: { type: String, required: true },
  action: { type: String },
  broker: { type: String },
  on: { type: Boolean, default: false },
  rebooting: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed } // Metadata for any additional device info
});

module.exports = mongoose.model('Device', deviceSchema);