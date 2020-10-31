const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstname: String,
  lastname: String,
  birth: String,
  gender: String,
  date: {
    type: Date,
    default: Date.now,
  },
  role: String,
  appts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appt',
  }],
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  },
  meds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Med',
  }],
});

module.exports = mongoose.model('User', userSchema);
