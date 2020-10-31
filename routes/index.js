const router = require('express').Router();
const passport = require('passport');

const auth = require('../config/authenticate');

router.get('/', auth.isAuthenticated(), (req, res) => {
  res.render('index');
});

router.get('/login', auth.isAuthenticated(), (req, res) => {
  res.render('login', { errorMessages: req.flash('errorMessages') });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('userLogin', (error, user, info) => {
    if (error) { return next(error); }
    if (!user) { return res.redirect('/login'); }
    req.login(user, (error) => {
      if (error) { return next(error); }
      return res.redirect(`/${user.role}`);
    });
  })(req, res, next);
});

router.get('/register', auth.isAuthenticated(), (req, res) => {
  res.render('register', { errorMessages: req.flash('errorMessages') });
});

router.post('/register', passport.authenticate('clientRegister', {
  successRedirect: '/client',
  failureRedirect: '/register',
}));

router.get('/logout', auth.checkAuthenticated(), (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
