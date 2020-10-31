const router = require('express').Router();
const bcrypt = require('bcryptjs');

const _ = require('lodash');
const validate = require('../config/validate');
const User = require('../models/user');
const Appt = require('../models/appt');
const Room = require('../models/room');
const Med = require('../models/med');

function getAuthenticatedUser(req) {
  const user = {
    email: req.user.email,
    firstname: req.user.firstname,
    lastname: req.user.email,
    birth: req.user.birth,
    gender: req.user.gender,
  };
  return user;
}

function newDateAddDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function createDates() {
  const dates = [];
  for (let i = 0; i <= 30; i += 1) {
    dates[i] = newDateAddDays(i).toISOString().split('T')[0];
  }
  return dates;
}

function createSlots() {
  const slots = [];
  for (let i = 0; i <= 30; i += 1) {
    slots[i] = [];
    for (let j = 0; j < 6; j += 1) {
      slots[i][j] = true;
    }
  }
  return slots;
}

function isValidAppt(doc, date, slot) {
  if (!doc || !date || !slot) {
    return false;
  }
  if (doc.appts) {
    doc.appts.forEach((appt) => {
      if (appt.slot === slot && appt.date === date) {
        return false;
      }
    });
  }
  return true;
}

// Dashboard

router.get('/', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const docs = await User.find({ role: 'doctor' });
    return res.render('client/dashboard', { user, docs });
  } catch (err) { return next(err); }
});

// Appointments

router.get('/appts', async (req, res, next) => {
  try {
    const appts = await Appt.find({ client: req.user._id }).populate('doctor');
    const user = getAuthenticatedUser(req);
    return res.render('client/appts', { user, appts, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.get('/appts/new', async (req, res, next) => {
  try {
    const docs = await User.find({ role: 'doctor' }).populate('appts');
    const lightDocs = _.map(docs, (doc) => {
      const lightDoc = {
        email: doc.email,
        firstname: doc.firstname,
        lastname: doc.lastname,
      };
      const dates = createDates();
      const slots = createSlots();
      doc.appts.forEach((appt) => {
        slots[dates.indexOf(appt.at)][appt.slot - 1] = false;
      });
      lightDoc.dates = dates;
      lightDoc.slots = slots;
      return lightDoc;
    });
    const user = getAuthenticatedUser(req);
    return res.render('client/create-appt', { user, docs: lightDocs });
  } catch (err) { return next(err); }
});

router.get('/appts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const appt = await Appt.findById(id).populate('doctor');
    const user = getAuthenticatedUser(req);
    return res.render('client/appt', { user, appt });
  } catch (err) { return next(err); }
});

router.post('/appts', async (req, res, next) => {
  try {
    let { doctor, at, slot } = req.body;
    slot = Number(slot);
    const doc = await User.findOne({ email: doctor, role: 'doctor' }).populate('appts');
    if (!isValidAppt(doc, at, slot)) {
      req.flash('errorMessages', 'Cannot create appointment. Please try again.');
      return res.redirect('/client/appts');
    }
    const appt = await Appt.create({
      client: req.user._id, doctor: doc._id, at, slot,
    });
    doc.appts.push(appt._id);
    await doc.save();
    const user = await User.findById(req.user._id);
    user.appts.push(appt._id);
    await user.save();
    return res.redirect('/client/appts');
  } catch (err) { return next(err); }
});

router.get('/appts/:id/edit', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = req.params;
    const appt = await Appt.findById(id).populate('doctor');
    const docs = await User.find({ role: 'doctor' }).populate('appts');
    const lightDocs = _.map(docs, (doc) => {
      const lightDoc = {
        email: doc.email,
        firstname: doc.firstname,
        lastname: doc.lastname,
      };
      const dates = createDates();
      const slots = createSlots();
      doc.appts.forEach((appt) => {
        slots[dates.indexOf(appt.at)][appt.slot - 1] = false;
      });
      lightDoc.dates = dates;
      lightDoc.slots = slots;
      return lightDoc;
    });
    return res.render('client/edit-appt', {
      user, appt, docs: lightDocs, errorMessages: req.flash('errorMessages'),
    });
  } catch (err) { return next(err); }
});

router.patch('/appts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let { doctor, at, slot } = req.body;
    slot = Number(slot);
    const doc = await User.findOne({ email: doctor, role: 'doctor' }).populate('appts');
    if (!isValidAppt(doc, at, slot)) {
      req.flash('errorMessages', 'Cannot update appointment. Please try again.');
      return res.redirect(`/client/appts/${id}/edit`);
    }
    await Appt.findByIdAndUpdate(id, {
      client: req.user._id, doctor: doc._id, at, slot,
    });
    return res.redirect('/client/appts');
  } catch (err) { return next(err); }
});

router.delete('/appts/:id/delete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = [];
    const appt = await Appt.findByIdAndDelete(id);
    const user = await User.findById(appt.client);
    const doc = await User.findById(appt.doctor);
    _.remove(user.appts, (e) => e === id);
    results.push(user.save());
    _.remove(doc.appts, (e) => e === id);
    results.push(doc.save());
    await Promise.all(results);
    return res.redirect('/client/appts');
  } catch (err) { return next(err); }
});

// Room

router.get('/room', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const { room } = await User.findById(req.user._id).populate({ path: 'room', populate: { path: 'doctor' } });
    return res.render('client/rooms', { user, room });
  } catch (err) { return next(err); }
});

// Medicines

router.get('/meds', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const { meds } = await User.findById(req.user._id).populate('meds');
    return res.render('client/meds', { user, meds });
  } catch (err) { return next(err); }
});

// Settings

router.get('/settings', (req, res) => {
  const user = getAuthenticatedUser(req);
  res.render('client/settings', { user, errorMessages: req.flash('errorMessages') });
});

router.post('/settings', async (req, res, next) => {
  try {
    let errorFound = false;
    if (req.body.password) {
      if (!bcrypt.compareSync(req.body.password, req.user.password)) {
        req.flash('errorMessages', 'Cannot change password. Try again later.');
        errorFound = true;
      }
      if (!validate.password(req.body.newPassword, req.body.confirmNewPassword)) {
        req.flash('errorMessages', 'Cannot change password. Password confirmation wrong.');
        errorFound = true;
      }
      if (errorFound) {
        return res.redirect('/client/settings');
      }
      await User.findByIdAndUpdate(req.user._id, {
        password: bcrypt.hashSync(req.body.newPassword, 8),
      });
      return res.redirect('/client');
    }
    if (!validate.name(req.body.firstname)) {
      errorFound = true;
      req.flash('errorMessages', 'Please provide a valid firstname.');
    }
    if (!validate.name(req.body.lastname)) {
      errorFound = true;
      req.flash('errorMessages', 'Please provide a valid lastname.');
    }
    if (!validate.date(req.body.birth)) {
      errorFound = true;
      req.flash('errorMessages', 'Please provide a valid date of birth.');
    }
    if (!validate.gender(req.body.gender)) {
      errorFound = true;
      req.flash('errorMessages', 'Please choose a gender.');
    }
    if (errorFound) {
      return res.redirect('/client/settings');
    }
    await User.findByIdAndUpdate(req.user._id, {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      birth: req.body.birth,
      gender: req.body.gender,
    });
    return res.redirect('/client');
  } catch (err) { return next(err); }
});

module.exports = router;
