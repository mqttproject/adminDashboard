const mongoose = require('mongoose');

const simulatorSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true
  },
  url: {
    type: String
  },
  title: {
    type: String,
    default: 'Simulator'
  },
  status: {
    type: String,
    default: 'offline'
  },
  owner: {
    type: String,
    ref: 'User'
  },
  devices: [{
    type: String,
    ref: 'Device'
  }],
  lastSeen: {
    type: Date,
    default: Date.now
  },
  expectedToken:{
    type: String,
    default: null
  }
});

module.exports = mongoose.model('Simulator', simulatorSchema);