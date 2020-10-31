const mongoose = require('mongoose');

const medSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: String,
  start: String,
  end: String,
  instr: String,
});

module.exports = mongoose.model('Med', medSchema);
