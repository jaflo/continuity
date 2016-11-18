var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var session = require('express-session');
var flash = require('connect-flash');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


mongoose.connect('mongodb://localhost/Continuity');
mongoose.Promise = require('bluebird');
var User = require('./models/user.js');
var Story = require('./models/story.js');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	secret: 'secret',
	saveUninitialized: true,
	resave: true
}));

app.use(expressValidator({
	errorFormatter: function(param, msg, value) {
		var namespace = param.split('.'),
			root = namespace.shift(),
			formParam = root;
		while (namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return msg + " ";
	}
}));

// set up passport stuff
app.use(passport.initialize());
app.use(passport.session());
require('./config/auth.js')(passport, LocalStrategy);
app.use(flash());

app.use(function(req, res, next) {
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	res.locals.user = req.user;
	res.locals.url = "http://localhost:3000" + req.originalUrl;
	next();
});

User.collection.drop(); //For testion purposes, deletes all previous users on startup
Story.collection.drop(); //For testion purposes, deletes all previous stories on startup
//If the database is new and their are no stories, create the first one
Story.collection.count({}, function(err, count) {
	if (count == 0) {
		var parentStory = new Story({
			shortID: '00000',
			parent: "this should never be a valid parent. kind of a hack", // [TODO] check if exists
			author: 'Your homedog, ejmejm',
			content: 'This is the parent story of all parents.', // [TODO] validate
			createdat: Date.now(),
			changedat: Date.now()
		});

		parentStory.save(function(err, parentStory) {
			if (err) return console.error(err);
			//console.dir(parentStory);
		});
		console.log("Save successful");
	}
});


// all routes
require('./routes/main')(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
