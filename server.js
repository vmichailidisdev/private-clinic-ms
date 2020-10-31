const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const createError = require('http-errors');

const auth = require('./config/authenticate');
const seedDB = require('./seedDB');

seedDB();

const app = express();
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, './public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const port = process.env.PORT || 3000;
mongoose
  .connect('mongodb://localhost:27017/cms', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch((error) => console.error(error));
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
}));

require('./config/passport')(passport);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(methodOverride('_method'));

app.use('/', require('./routes/index'));
app.use('/client', auth.canView(), auth.checkRole('client'), require('./routes/client'));
app.use('/sec', auth.canView(), auth.checkRole('sec'), require('./routes/sec'));
app.use('/doctor', auth.canView(), auth.checkRole('doctor'), require('./routes/doctor'));
app.use('/admin', auth.canView(), auth.checkRole('admin'), require('./routes/admin'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port);
