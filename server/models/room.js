const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => uuidv4()
  },
  title: { 
    type: String, 
    required: true 
  },
  owner: { 
    type: String, 
    ref: 'User' 
  },
  simulators: [{ // Changed from simulatorIds to simulators
    type: String, 
    ref: 'Simulator' 
  }]
});

module.exports = mongoose.model('Room', roomSchema);