const router = require('express').Router();
const bcrypt = require('bcryptjs');

const _ = require('lodash');
const validate = require('../config/validate');
const User = require('../models/user');
const Appt = require('../models/appt');
const Room = require('../models/room');
const Med = require('../models/med');

// Utilities

function getAuthenticatedUser(req) {
  const user = {
    email: req.user.email,
    firstname: req.user.firstname,
    lastname: req.user.lastname,
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
  if (!doc || !doc.appts || !date || !slot) {
    return false;
  }
  doc.appts.forEach((appt) => {
    if (appt.slot === slot && appt.date === date) {
      return false;
    }
  });
  return true;
}

function isValidMed({
  client, start, end, name, instr,
}) {
  if (!client || !start || !end || !name || !instr) {
    return false;
  }
  // TODO must add maximum chracters validation to instr
  if (!validate.mindate(start) || !validate.mindate(end) || !validate.name(name) || !(instr.length > 0)) {
    return false;
  }
  return true;
}

function countMales(col) {
  let count = 0;
  let males = 0;
  col.forEach((e) => {
    count += 1;
    if (e.client.gender === 'male') males += 1;
  });
  return { count, males };
}

async function createLightRooms() {
  const rooms = await Room.find({});
  const lightRooms = [];
  for (let i = 0; i < 10; i += 1) {
    lightRooms[i] = [];
  }
  const res = rooms.forEach((room) => {
    lightRooms[room.number - 1].push({ start: room.start, end: room.end });
  });
  return lightRooms;
}

async function isValidRoom({
  client, doctor, number, start, end,
}, req, res) {
  if (!client || !doctor || !number || !start || !end) {
    req.flash('errorMessages', 'Cannot reserve room. Try again later.');
    return false;
  }
  // Shall we check if the doctor is responsible for a diffrent room that time? -> No
  if (client.room) {
    req.flash('errorMessages', 'Cannot reserve room. This client has already a room reserved.');
    return false;
  }
  if (number < 0 || number > 10) {
    req.flash('errorMessages', 'Cannot reserve room with this number. Please try again with a correct Room Number.');
    return false;
  }
  if (new Date(start) > new Date(end)) {
    req.flash('errorMessages', 'Cannot reserve room, start date is greater than end date. Please try again with correct Room Dates.');
    return false;
  }
  let errorFound = false;
  const lightRooms = await createLightRooms();
  lightRooms[number - 1].forEach((room) => {
    const roomStart = new Date(room.start);
    const roomEnd = new Date(room.end);
    start = new Date(start);
    end = new Date(end);
    if ((start >= roomStart && start <= roomEnd)
      || (end >= roomStart && end <= roomEnd)) {
      errorFound = true;
    }
  });
  if (errorFound) {
    let reservedDates = '';
    lightRooms[number - 1].forEach((room) => {
      reservedDates += `[from: ${room.end} - to: ${room.end}], `;
    });
    req.flash('errorMessages', `Date overlap, cannot reserve room.
    Reserved dates for Room with Number (${number}) are: ${reservedDates}`);
    return false;
  }
  return true;
}

async function isValidRoomEdit({ number, start, end }) {
  if (number < 0 || number > 10) {
    req.flash('errorMessages', 'Cannot reserve room with this number. Please try again with a correct Room Number.');
    return false;
  }
  if (new Date(start) > new Date(end)) {
    req.flash('errorMessages', 'Cannot reserve room, start date is greater than end date. Please try again with correct Room Dates.');
    return false;
  }
  let errorFound = false;
  const lightRooms = await createLightRooms();
  lightRooms[number - 1].forEach((room) => {
    const roomStart = new Date(room.start);
    const roomEnd = new Date(room.end);
    start = new Date(start);
    end = new Date(end);
    if ((start >= roomStart && start <= roomEnd)
      || (end >= roomStart && end <= roomEnd)) {
      errorFound = true;
    }
  });
  if (errorFound) {
    let reservedDates = '';
    lightRooms[number - 1].forEach((room) => {
      reservedDates += `[from: ${room.end} - to: ${room.end}], `;
    });
    req.flash('errorMessages', `Date overlap, cannot reserve room.
    Reserved dates for Room with Number (${number}) are: ${reservedDates}`);
    return false;
  }
  return true;
}

// Dashboard

router.get('/', async (req, res, next) => {
  try {
    let results = [];
    results.push(User.countDocuments({}));
    results.push(User.countDocuments({ gender: 'male' }));
    results.push(User.countDocuments({ role: 'client' }));
    results.push(User.countDocuments({ role: 'sec' }));
    results.push(User.countDocuments({ role: 'doctor' }));
    results.push(Appt.find({}).populate('client'));
    results.push(Room.find({}).populate('client'));
    results.push(Med.find({}).populate('client'));

    results = await Promise.all(results).then((res) => res).catch((err) => next(err));

    let temp = countMales(results[5]);
    const appts = temp.count;
    const apptsMales = temp.males;

    temp = countMales(results[6]);
    const rooms = temp.count;
    const roomsMales = temp.males;

    temp = countMales(results[7]);
    const meds = temp.count;
    const medsMales = temp.males;

    const user = getAuthenticatedUser(req);
    const stats = {
      users: results[0],
      males: results[1],
      females: results[0] - results[1],
      clients: results[2],
      secs: results[3],
      docs: results[4],
      appts,
      apptsMales,
      rooms,
      roomsMales,
      meds,
      medsMales,
    };
    return res.render('doctor/dashboard', { user, stats });
  } catch (err) { return next(err); }
});

// Clients

router.get('/clients', (req, res, next) => {
  const { email } = req.query;
  if (email) {
    User.findOne({ email, role: 'client' }, (err, client) => {
      if (err) return next(err);
      if (!client) {
        req.flash('errorMessages', 'Cannot find this client.');
        return res.redirect('/doctor/clients');
      }
      return res.redirect(`/doctor/clients/${client._id}`);
    });
  } else {
    User.find({ role: 'client' }).sort('-date').limit(30).exec((err, clients) => {
      if (err) return next(err);
      if (!clients) return res.redirert('/doctor');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('doctor/clients', { user, clients, errorMessages: req.flash('errorMessages') });
    });
  }
});

router.get('/clients/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const clt = await User.findById(id)
      .populate({ path: 'room', populate: { path: 'doctor' } })
      .populate('meds')
      .populate({ path: 'appts', populate: { path: 'doctor' } });
    if (!clt) {
      req.flash('errorMessages', 'Cannot find this client.');
      res.redirert('/doctor/clients');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('doctor/client', { user, clt });
  } catch (err) { return next(err); }
});

// Secretary

router.get('/secs', (req, res, next) => {
  const { email } = req.query;
  if (email) {
    User.findOne({ email, role: 'sec' }, (err, sec) => {
      if (err) return next(err);
      if (!sec) {
        req.flash('errorMessages', 'Cannot find this secretary.');
        return res.redirect('/doctor/secs');
      }
      return res.redirect(`/doctor/secs/${sec._id}`);
    });
  } else {
    User.find({ role: 'sec' }).sort('-date').limit(30).exec((err, secs) => {
      if (err) return next(err);
      if (!secs) return res.redirert('/doctor');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('doctor/secs', { user, secs, errorMessages: req.flash('errorMessages') });
    });
  }
});

router.get('/secs/:id', (req, res, next) => {
  const { id } = req.params;
  User.findById(id, (err, sec) => {
    if (err) return next(err);
    if (!sec) {
      req.flash('errorMessages', 'Cannot find this secretary.');
      res.redirert('/doctor/secs');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('doctor/sec', { user, sec });
  });
});

// Doctor

router.get('/docs', (req, res, next) => {
  const { email } = req.query;
  if (email) {
    User.findOne({ email, role: 'doctor' }, (err, doc) => {
      if (err) return next(err);
      if (!doc) {
        req.flash('errorMessages', 'Cannot find this doctor.');
        return res.redirect('/doctor/docs');
      }
      return res.redirect(`/doctor/docs/${doc._id}`);
    });
  } else {
    User.find({ role: 'doctor' }).sort('-date').limit(30).exec((err, docs) => {
      if (err) return next(err);
      if (!docs) return res.redirert('/doctor');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('doctor/docs', { user, docs, errorMessages: req.flash('errorMessages') });
    });
  }
});

router.get('/docs/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const doc = await User.findById(id)
      .populate({ path: 'appts', populate: { path: 'client' } });
    const rooms = await Room.find({ doctor: id })
      .populate('client');
    if (!doc) {
      req.flash('errorMessages', 'Cannot find this doctor.');
      res.redirert('/doctor/docs');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('doctor/doc', {
      user, doc, rooms, errorMessages: req.flash('errorMessages'),
    });
  } catch (err) { return next(err); }
});

// Appointments

router.get('/appts', async (req, res, next) => {
  try {
    const appts = await Appt.find({ doctor: req.user._id }).populate('client');
    const user = getAuthenticatedUser(req);
    return res.render('doctor/appts', { user, appts, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.get('/appts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const appt = await Appt.findById(id).populate('client');
    const user = getAuthenticatedUser(req);
    return res.render('doctor/appt', { user, appt });
  } catch (err) { return next(err); }
});

router.get('/appts/:id/edit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = getAuthenticatedUser(req);
    const appt = await Appt.findById(id);
    const doc = await User.findById(req.user._id).populate('appts');
    const lightDoc = {
      email: doc.email,
      firstname: doc.firstname,
      lastname: doc.lastname,
    };
    const dates = createDates();
    const slots = createSlots();
    doc.appts.forEach((e) => {
      slots[dates.indexOf(e.at)][e.slot - 1] = false;
    });
    lightDoc.dates = dates;
    lightDoc.slots = slots;
    return res.render('doctor/edit-appt', {
      user, appt, doc: lightDoc, errorMessages: req.flash('errorMessages'),
    });
  } catch (err) { return next(err); }
});

router.patch('/appts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { at, slot } = req.body;
    const doc = await User.findById(req.user._id).populate('appts');
    if (!isValidAppt(doc, at, slot)) {
      req.flash('errorMessages', 'Cannot update appointment. Please try again.');
      return res.redirect(`/doctor/appts/${id}/edit`);
    }
    await Appt.findByIdAndUpdate(id, {
      at, slot,
    });
    return res.redirect('/doctor/appts');
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
    return res.redirect('/doctor/appts');
  } catch (err) { return next(err); }
});

// Rooms

router.get('/rooms', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const rooms = await Room.find({ doctor: req.user._id }).populate('client');
    return res.render('doctor/rooms', { user, rooms, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.get('/rooms/new', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    return res.render('doctor/reserve-room', { user, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.get('/rooms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = getAuthenticatedUser(req);
    const room = await Room.findById(id).populate('client');
    return res.render('doctor/room', { user, room, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.get('/rooms/:id/edit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = getAuthenticatedUser(req);
    const room = await Room.findById(id).populate('client');
    return res.render('doctor/edit-room', { user, room, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.patch('/rooms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { number, start, end } = req.body;
    if (!(await isValidRoomEdit({
      number, start, end,
    }, req))) {
      return res.redirect(`/doctor/rooms/${id}/edit`);
    }
    const room = await Room.findByIdAndUpdate(id, {
      number, start, end,
    });
    return res.redirect('/doctor/rooms');
  } catch (err) { return next(err); }
});

router.post('/rooms', async (req, res, next) => {
  try {
    const client = await User.findOne({ email: req.body.client, role: 'client' });
    const doctor = await User.findById(req.user._id);
    const { number, start, end } = req.body;
    if (!(await isValidRoom({
      client, doctor, number, start, end,
    }, req))) {
      return res.redirect('/doctor/rooms/new');
    }
    const room = await Room.create({
      client: client._id, doctor: req.user._id, number, start, end,
    });
    client.room = room._id;
    await client.save();
    return res.redirect('/doctor/rooms');
  } catch (err) { return next(err); }
});

router.delete('/rooms/:id/delete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await Room.findByIdAndDelete(id);
    const client = await User.findById(room.client);
    client.room = null;
    await client.save();
    return res.redirect('/doctor/rooms');
  } catch (err) { return next(err); }
});

// Medicines

router.get('/meds', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const meds = await Med.find({}).populate('client');
    return res.render('doctor/meds', { user, meds, errorMessages: req.flash('errorMessages') });
  } catch (err) { return next(err); }
});

router.get('/meds/new', (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    return res.render('doctor/create-med', { user });
  } catch (err) { return next(err); }
});

router.get('/meds/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = getAuthenticatedUser(req);
    const med = await Med.findById(id).populate('client');
    return res.render('doctor/med', { user, med });
  } catch (err) { return next(err); }
});

router.post('/meds', async (req, res, next) => {
  try {
    const {
      start, end, name, instr,
    } = req.body;
    const client = await User.findOne({ email: req.body.client, role: 'client' });
    if (!isValidMed({
      client, name, start, end, instr,
    })) {
      req.flash('errorMessages', 'Cannot create medicine. Try again later.');
      return res.redirect('/doctor/meds');
    }
    const med = await Med.create({
      client: client._id, name, start, end, instr,
    });
    client.meds.push(med._id);
    await client.save();
    return res.redirect('/doctor/meds');
  } catch (err) { return next(err); }
});

router.delete('/meds/:id/delete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const med = await Med.findByIdAndDelete(id);
    const client = await User.findById(med.client);
    _.remove(client.meds, (e) => e._id === id);
    await client.save();
    return res.redirect('/doctor/meds');
  } catch (err) { return next(err); }
});

// Settings

router.get('/settings', (req, res) => {
  const user = getAuthenticatedUser(req);
  res.render('doctor/settings', { user, errorMessages: req.flash('errorMessages') });
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
        return res.redirect('/doctor/settings');
      }
      await User.findByIdAndUpdate(req.user._id, {
        password: bcrypt.hashSync(req.body.newPassword, 8),
      });
      return res.redirect('/doctor');
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
      return res.redirect('/doctor/settings');
    }
    await User.findByIdAndUpdate(req.user._id, {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      birth: req.body.birth,
      gender: req.body.gender,
    });
    return res.redirect('/doctor');
  } catch (err) { return next(err); }
});

module.exports = router;
