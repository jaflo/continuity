var tools = require('../config/tools.js');
var passport = require('passport');

module.exports = function(app) {
	app.post('/login', passport.authenticate('local-login', {
		successRedirect: '/', // redirect to the secure profile section
		failureRedirect: '/login', // redirect back to the signup page if there is an error
		failureFlash: true // allow flash messages
	}));

	app.get('/login', function(req, res, next) {
		res.render('login');
    });

	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect("back");
	});


	app.post('/signup', function(req, res) {
		//req.assert('password', 'Passwords must match').equals(req.body.reentered);
		//req.assert('password', 'Passwords must be at least 6 characters long').isLength({min: 6, max: undefined});
		req.assert('displayname', 'Please enter a display name').notEmpty();
		req.assert('displayname', 'Names cannot exceed 32 characters').isLength({min: undefined, max: 32});
		req.assert('email', 'Please enter an email').notEmpty();
		req.assert('email', 'Emails cannot exceed 500 characters').isLength({min: undefined, max: 500});
		//req.assert('email', 'Emails must be vaild').isEmail();
		var errors = req.validationErrors();
		if(!errors) {
			passport.authenticate('local-signup', {
				successRedirect: '/', // redirect to the secure profile section
				failureRedirect: '/signup', // redirect back to the signup page if there is an error
				failureFlash: true // allow flash messages
			})(req, res);
		}
		else {
			tools.failRequest(req, res, errors);
		}
	});

	app.get('/signup', function(req, res, next) {
		res.render('signup');
    });
};
