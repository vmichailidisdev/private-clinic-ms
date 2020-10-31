const mongoose = require('mongoose');

const apptSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  at: String,
  slot: Number,
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Appt', apptSchema);
