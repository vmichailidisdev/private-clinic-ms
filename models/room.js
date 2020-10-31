const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: Number,
  start: String,
  end: String,
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

module.exports = mongoose.model('Room', roomSchema);
