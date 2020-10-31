const router = require('express').Router();
const bcrypt = require('bcryptjs');

const _ = require('lodash');
const validate = require('../config/validate');
const User = require('../models/user');
const Appt = require('../models/appt');
const Room = require('../models/room');
const Med = require('../models/med');

// Utilities

function countMales(col) {
  let count = 0;
  let males = 0;
  col.forEach((e) => {
    count += 1;
    if (e.client.gender === 'male') males += 1;
  });
  return { count, males };
}

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

function isValidAppt(clt, doc, date, slot) {
  if (!clt || !doc || !date || !slot) {
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

router.get('/', async (req, res) => {
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
    return res.render('sec/dashboard', { user, stats });
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
        return res.redirect('/sec/clients');
      }
      return res.redirect(`/sec/clients/${client._id}`);
    });
  } else {
    User.find({ role: 'client' }).sort('-date').limit(30).exec((err, clients) => {
      if (err) return next(err);
      if (!clients) return res.redirert('/sec');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('sec/clients', { user, clients, errorMessages: req.flash('errorMessages') });
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
      res.redirert('/sec/clients');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('sec/client', { user, clt });
  } catch (err) { return next(err); }
});

// Secretary

router.get('/secs', (req, res, next) => {
  const { email } = req.query;
  if (email) {
    User.findOne({ email, role: 'sec' }, (err, sec) => {
      if (err) return next(err);
      if (!sec) {
        req.flash('errorMessages', 'Cannot find this client.');
        return res.redirect('/sec/secs');
      }
      return res.redirect(`/sec/secs/${sec._id}`);
    });
  } else {
    User.find({ role: 'sec' }).sort('-date').limit(30).exec((err, secs) => {
      if (err) return next(err);
      if (!secs) return res.redirert('/sec');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('sec/secs', { user, secs, errorMessages: req.flash('errorMessages') });
    });
  }
});

router.get('/secs/:id', (req, res, next) => {
  const { id } = req.params;
  User.findById(id, (err, sec) => {
    if (err) return next(err);
    if (!sec) {
      req.flash('errorMessages', 'Cannot find this secretary.');
      res.redirert('/sec/secs');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('sec/sec', { user, sec });
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
        return res.redirect('/sec/docs');
      }
      return res.redirect(`/sec/docs/${doc._id}`);
    });
  } else {
    User.find({ role: 'doctor' }).sort('-date').limit(30).exec((err, docs) => {
      if (err) return next(err);
      if (!docs) return res.redirert('/sec');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('sec/docs', { user, docs, errorMessages: req.flash('errorMessages') });
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
      req.flash('errorMessages', 'Cannot find this client.');
      res.redirert('/sec/docs');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('sec/doc', {
      user, doc, rooms, errorMessages: req.flash('errorMessages'),
    });
  } catch (err) { return next(err); }
});

// Apointments

router.get('/appts', (req, res, next) => {
  Appt.find({}).populate('client').populate('doctor').exec((err, appts) => {
    if (err) return next(err);
    const user = getAuthenticatedUser(req);
    return res.render('sec/appts', { user, appts, errorMessages: req.flash('errorMessages') });
  });
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
    return res.render('sec/create-appt', { user, docs: lightDocs });
  } catch (err) { return next(err); }
});

router.get('/appts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const appt = await Appt.findById(id).populate('doctor').populate('client');
    const user = getAuthenticatedUser(req);
    return res.render('sec/appt', { user, appt });
  } catch (err) { return next(err); }
});

router.post('/appts', async (req, res, next) => {
  try {
    let {
      client, doctor, at, slot,
    } = req.body;
    slot = Number(slot);
    const doc = await User.findOne({ email: doctor, role: 'doctor' }).populate('appts');
    const clt = await User.findOne({ email: client, role: 'client' });
    if (!isValidAppt(clt, doc, at, slot)) {
      req.flash('errorMessages', 'Cannot create appointment. Please try again.');
      return res.redirect('/sec/appts');
    }
    const appt = await Appt.create({
      client: clt._id, doctor: doc._id, at, slot,
    });
    doc.appts.push(appt._id);
    await doc.save();
    const user = await User.findById(req.user._id);
    user.appts.push(appt._id);
    await user.save();
    return res.redirect('/sec/appts');
  } catch (err) { return next(err); }
});

router.get('/appts/:id/edit', async (req, res, next) => {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = req.params;
    const appt = await Appt.findById(id).populate('doctor').populate('client');
    const docs = await User.find({ role: 'doctor' }).populate('appts');
    const { client } = appt;
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
    return res.render('sec/edit-appt', {
      user, appt, clt: client, docs: lightDocs, errorMessages: req.flash('errorMessages'),
    });
  } catch (err) { return next(err); }
});

router.patch('/appts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      client, doctor, at, slot,
    } = req.body;
    slot = Number(slot);
    const appt = await Appt.findById(id).populate('client');
    const doc = await User.findOne({ email: doctor, role: 'doctor' }).populate('appts');
    const clt = appt.client;
    if (!isValidAppt(clt, doc, at, slot)) {
      req.flash('errorMessages', 'Cannot update appointment. Please try again.');
      return res.redirect(`/sec/appts/${id}/edit`);
    }
    await Appt.findByIdAndUpdate(id, {
      doctor: doc._id, at, slot,
    });
    return res.redirect('/sec/appts');
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
    return res.redirect('/sec/appts');
  } catch (err) { return next(err); }
});

// Rooms

router.get('/rooms', (req, res, next) => {
  Room.find({}).populate('client').populate('doctor').exec((err, rooms) => {
    if (err) return next(err);
    const user = getAuthenticatedUser(req);
    return res.render('sec/rooms', { user, rooms });
  });
});

// Medicines

router.get('/meds', (req, res, next) => {
  Med.find({}).populate('client').exec((err, meds) => {
    if (err) return next(err);
    const user = getAuthenticatedUser(req);
    return res.render('sec/meds', { user, meds });
  });
});

// Settings

router.get('/settings', (req, res, next) => {
  const user = getAuthenticatedUser(req);
  res.render('sec/settings', { user, errorMessages: req.flash('errorMessages') });
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
        return res.redirect('/sec/settings');
      }
      await User.findByIdAndUpdate(req.user._id, { password: bcrypt.hashSync(req.body.newPassword, 8) });
      return res.redirect('/sec');
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
      return res.redirect('/sec/settings');
    }
    await User.findByIdAndUpdate(req.user._id, {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      birth: req.body.birth,
      gender: req.body.gender,
    });
    return res.redirect('/sec');
  } catch (err) { return next(err); }
});
module.exports = router;
