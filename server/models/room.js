const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  simulatorIds: [{ type: String }]
});

module.exports = mongoose.model('Room', roomSchema);