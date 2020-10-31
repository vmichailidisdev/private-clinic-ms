const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const validate = require('./validate');
const User = require('../models/user');

module.exports = (passport) => {
  passport.use('userLogin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  ((req, email, password, done) => {
    User.findOne({ email }, (err, user) => {
      if (err) return done(err);
      if (!user) {
        req.flash('errorMessages', 'Incorrect email.');
        return done(null, false);
      }
      if (!bcrypt.compareSync(password, user.password)) {
        req.flash('errorMessages', 'Incorrect password.');
        return done(null, false);
      }
      return done(null, user);
    });
  })));

  passport.use('clientRegister', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  ((req, email, password, done) => {
    User.findOne({ email }, (err, client) => {
      const {
        email, password, confirmPassword, firstname, lastname, birth, gender,
      } = req.body;
      let errorFound = false;
      if (err) return done(err);
      if (client) {
        req.flash('errorMessages', 'This email address is already in use.');
        return done(null, false);
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
      if (errorFound) return done(null, false);
      const hashedPassword = bcrypt.hashSync(password, 8);
      const role = 'client';
      return User.create({
        email,
        password: hashedPassword,
        firstname,
        lastname,
        birth,
        gender,
        role,
      }, (err, client) => {
        if (err) return done(err);
        return done(null, client);
      });
    });
  })));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user);
    });
  });
};
