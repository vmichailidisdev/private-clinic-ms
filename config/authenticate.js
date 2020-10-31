module.exports = {
  canView() {
    return (req, res, next) => {
      if (req.isAuthenticated()) return next();
      req.flash(
        'errorMessages',
        'You are not authorized to view this resource. Please log in.',
      );
      return res.redirect('/login');
    };
  },
  isAuthenticated() {
    return (req, res, next) => {
      if (req.isAuthenticated()) return res.redirect(`/${req.user.role}`);
      return next();
    };
  },
  checkAuthenticated() {
    return (req, res, next) => {
      if (req.isAuthenticated()) return next();
      return res.redirect('/login');
    };
  },
  checkRole(role) {
    return (req, res, next) => {
      if (req.user.role === role) return next();
      return res.redirect(`/${req.user.role}`);
    };
  },
};
