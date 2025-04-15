const mongoose = require('mongoose');

const simulatorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  title: { type: String, default: 'Simulator' },
  status: { type: String, default: 'online' },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Simulator', simulatorSchema);