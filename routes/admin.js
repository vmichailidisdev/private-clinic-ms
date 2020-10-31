const router = require('express').Router();
const bcrypt = require('bcryptjs');

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

    results = await Promise.all(results);

    let temp = countMales(results[5]);
    const appts = temp.count;
    const apptsMales = temp.males;

    temp = countMales(results[6]);
    const rooms = temp.count;
    const roomsMales = temp.males;

    temp = countMales(results[7]);
    const meds = temp.count;
    const medsMales = temp.males;

    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    const stats = {
      users: results[0],
      males: results[1],
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
    return res.render('admin/dashboard', { user, stats });
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
        return res.redirect('/admin/clients');
      }
      return res.redirect(`/admin/clients/${client._id}`);
    });
  } else {
    User.find({ role: 'client' }).sort('-date').limit(30).exec((err, clients) => {
      if (err) return next(err);
      if (!clients) return res.redirert('/admin');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('admin/clients', { user, clients, errorMessages: req.flash('errorMessages') });
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
      res.redirert('/admin/clients');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('admin/client', { user, clt });
  } catch (err) { return next(err); }
});

router.delete('/clients/:id/delete', async (req, res, next) => {
  const { id } = req.params;
  try {
    const results = [];
    const clt = await User.findById(id);

    // Delete all appointments from Appt collection and Doctors
    if (clt.appts) {
      clt.appts.forEach(async (appt) => {
        const deletedAppt = await Appt.findByIdAndDelete(appt);
        const doc = await User.findById(deletedAppt.doctor);
        const index = doc.appts.findIndex((e) => e === appt);
        doc.appts.splice(index, 1);
        results.push(doc.save());
      });
    }

    // Delete all appointments from Room collection and User.role === 'doctor'.appts
    if (clt.room) {
      results.push(Room.findByIdAndDelete(clt.room));
    }

    // Delete medicines documents
    if (clt.meds) {
      clt.meds.forEach((med) => {
        results.push(Med.findByIdAndDelete(med));
      });
    }
    await Promise.all(results);
    await User.findByIdAndDelete(id);
    return res.redirect('/admin/clients');
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
        return res.redirect('/admin/secs');
      }
      return res.redirect(`/admin/secs/${sec._id}`);
    });
  } else {
    User.find({ role: 'sec' }).sort('-date').limit(30).exec((err, secs) => {
      if (err) return next(err);
      if (!secs) return res.redirert('/admin');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('admin/secs', { user, secs, errorMessages: req.flash('errorMessages') });
    });
  }
});

router.post('/secs', (req, res, next) => {
  const {
    email, password, confirmPassword, firstname, lastname, birth, gender,
  } = req.body;
  User.findOne({ email }, (err, sec) => {
    let errorFound = false;
    if (err) return next(err);
    if (sec) {
      req.flash('errorMessages', 'This email address is already in use.');
      return res.redirect('/admin/secs');
    }
    if (!validate.email(email)) {
      req.flash('errorMessages', 'Please provide a valid email.');
      errorFound = true;
    }
    if (!validate.password(password, confirmPassword)) {
      req.flash('errorMessages', 'Please provide a valid password.');
      errorFound = true;
    }
    if (!validate.name(firstname)) {
      req.flash('errorMessages', 'Please provide a valid first name.');
      errorFound = true;
    }
    if (!validate.name(lastname)) {
      req.flash('errorMessages', 'Please provide a valid last name.');
      errorFound = true;
    }
    if (!validate.date(birth)) {
      req.flash('errorMessages', 'Please provide a valid date.');
      errorFound = true;
    }
    if (!validate.gender(gender)) {
      req.flash('errorMessages', 'Please provide a valid gender.');
      errorFound = true;
    }
    if (errorFound) return res.redirect('/admin/secs');
    const hashedPassword = bcrypt.hashSync(password, 8);
    const role = 'sec';
    return User.create({
      email,
      password: hashedPassword,
      firstname,
      lastname,
      birth,
      gender,
      role,
    }, (err, sec) => {
      if (err) return next(err);
      return res.redirect('/admin/secs');
    });
  });
});

router.get('/secs/new', (req, res) => {
  const user = {
    email: req.user.email,
    firstname: req.user.firstname,
    lastname: req.user.lastname,
    birth: req.user.birth,
    gender: req.user.gender,
  };
  return res.render('admin/create_sec', { user, errorMessages: req.flash('errorMessages') });
});

router.get('/secs/:id', (req, res, next) => {
  const { id } = req.params;
  User.findById(id, (err, sec) => {
    if (err) return next(err);
    if (!sec) {
      req.flash('errorMessages', 'Cannot find this secretary.');
      res.redirert('/admin/secs');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('admin/sec', { user, sec });
  });
});

router.delete('/secs/:id/delete', (req, res, next) => {
  const { id } = req.params;
  User.findByIdAndDelete(id, (err) => {
    if (err) return next(err);
    return res.redirect('/admin/secs');
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
        return res.redirect('/admin/docs');
      }
      return res.redirect(`/admin/docs/${doc._id}`);
    });
  } else {
    User.find({ role: 'doctor' }).sort('-date').limit(30).exec((err, docs) => {
      if (err) return next(err);
      if (!docs) return res.redirert('/admin');
      const user = {
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        birth: req.user.birth,
        gender: req.user.gender,
      };
      return res.render('admin/docs', { user, docs, errorMessages: req.flash('errorMessages') });
    });
  }
});

router.post('/docs', (req, res, next) => {
  const {
    email, password, confirmPassword, firstname, lastname, birth, gender,
  } = req.body;
  User.findOne({ email }, (err, sec) => {
    let errorFound = false;
    if (err) return next(err);
    if (sec) {
      req.flash('errorMessages', 'This email address is already in use.');
      return res.redirect('/admin/docs');
    }
    if (!validate.email(email)) {
      req.flash('errorMessages', 'Please provide a valid email.');
      errorFound = true;
    }
    if (!validate.password(password, confirmPassword)) {
      req.flash('errorMessages', 'Please provide a valid password.');
      errorFound = true;
    }
    if (!validate.name(firstname)) {
      req.flash('errorMessages', 'Please provide a valid first name.');
      errorFound = true;
    }
    if (!validate.name(lastname)) {
      req.flash('errorMessages', 'Please provide a valid last name.');
      errorFound = true;
    }
    if (!validate.date(birth)) {
      req.flash('errorMessages', 'Please provide a valid date.');
      errorFound = true;
    }
    if (!validate.gender(gender)) {
      req.flash('errorMessages', 'Please provide a valid gender.');
      errorFound = true;
    }
    if (errorFound) return res.redirect('/admin/docs');
    const hashedPassword = bcrypt.hashSync(password, 8);
    const role = 'doctor';
    return User.create({
      email,
      password: hashedPassword,
      firstname,
      lastname,
      birth,
      gender,
      role,
    }, (err, sec) => {
      if (err) return next(err);
      return res.redirect('/admin/docs');
    });
  });
});

router.get('/docs/new', (req, res) => {
  const user = {
    email: req.user.email,
    firstname: req.user.firstname,
    lastname: req.user.lastname,
    birth: req.user.birth,
    gender: req.user.gender,
  };
  return res.render('admin/create_doc', { user, errorMessages: req.flash('errorMessages') });
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
      res.redirert('/admin/docs');
    }
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('admin/doc', {
      user, doc, rooms, errorMessages: req.flash('errorMessages'),
    });
  } catch (err) { return next(err); }
});

router.delete('/docs/:id/delete', async (req, res, next) => {
  const { id } = req.params;
  try {
    const doc = await User.findById(id);
    if (!doc.appts.legth) {
      req.flash('errorMessages', 'Cannot delete that Doctor. Pending appointments.');
      return res.redirect(`/admin/docs/${id}`);
    }
    if (!doc.appts.legth) {
      req.flash('errorMessages', 'Cannot delete that Doctor. Responsible for hospitalized patients.');
      return res.redirect(`/admin/docs/${id}`);
    }
    // TODO handle medicines already given to some clients (put if (client.meds[0-...].doctor)
    // in the views of the clients or a string called doctor not in database anymore)
    await User.findByIdAndDelete(id);
    return res.redirect('/admin/docs');
  } catch (err) { return next(err); }
});

// Apointments

router.get('/appts', (req, res, next) => {
  Appt.find({}).populate('client').populate('doctor').exec((err, appts) => {
    if (err) return next(err);
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('admin/appts', { user, appts });
  });
});

// Rooms

router.get('/rooms', (req, res, next) => {
  Room.find({}).populate('client').populate('doctor').exec((err, rooms) => {
    if (err) return next(err);
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('admin/rooms', { user, rooms });
  });
});

// Medicines

router.get('/meds', (req, res, next) => {
  Med.find({}).populate('client').exec((err, meds) => {
    if (err) return next(err);
    const user = {
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      birth: req.user.birth,
      gender: req.user.gender,
    };
    return res.render('admin/meds', { user, meds });
  });
});

router.get('/settings', (req, res, next) => {
  const user = {
    email: req.user.email,
    firstname: req.user.firstname,
    lastname: req.user.lastname,
    birth: req.user.birth,
    gender: req.user.gender,
  };
  res.render('admin/settings', { user, errorMessages: req.flash('errorMessages') });
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
        return res.redirect('/admin/settings');
      }
      await User.findByIdAndUpdate(req.user._id, { password: bcrypt.hashSync(req.body.newPassword, 8) });
      return res.redirect('/admin');
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
      return res.redirect('/admin/settings');
    }
    await User.findByIdAndUpdate(req.user._id, {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      birth: req.body.birth,
      gender: req.body.gender,
    });
    return res.redirect('/admin');
  } catch (err) { return next(err); }
});

module.exports = router;
