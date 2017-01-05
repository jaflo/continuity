var tools = require('../config/tools.js');
var passport = require('passport');
var simple_recaptcha = require('simple-recaptcha-new');
var PRIVATE_KEY = '6LfEwhAUAAAAALOzlh7iNvjQ04mIxABtfj5_WG_q';

module.exports = function(app) {
	app.post("/login", passport.authenticate('local-login',
	    { failureRedirect: '/login',
	      failureFlash: true }), function(req, res) {
	        if (req.body.remember) {
	          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
	        } else {
	          req.session.cookie.expires = false; // Cookie expires at end of session
	        }
	      res.redirect('/');
	});

	app.get('/login', function(req, res, next) {
		res.render('login');
    });

	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect("back");
	});


	app.post('/signup', function(req, res) {
		var ip = req.ip; // this is an optional parameter
		var response = req.body['g-recaptcha-response'];

		simple_recaptcha(PRIVATE_KEY, ip, response, function(err) {
			if (err) return tools.failRequest(req, res, err.message);
			req.assert('password', 'Passwords must match').equals(req.body.reentered);
			req.assert('password', 'Passwords must be at least 6 characters long').isLength({min: 6, max: undefined});
			req.assert('displayname', 'Please enter a display name').notEmpty();
			req.assert('displayname', 'Names cannot exceed 32 characters').isLength({min: undefined, max: 32});
			req.assert('email', 'Please enter an email').notEmpty();
			req.assert('email', 'Emails cannot exceed 500 characters').isLength({min: undefined, max: 500});
			req.assert('email', 'Emails must be vaild').isEmail();
			req.assert('emoji', 'Please enter one emoji').isLength({min: 1, max: 20});
			req.assert('emoji', 'Please enter a valid emoji').isEmoji();
			req.flash("email", req.body.email);
			req.flash("displayname", req.body.displayname);
			req.flash("emoji", req.body.emoji);
			var errors = req.validationErrors();
			if (!errors) {
				passport.authenticate('local-signup', {
					successRedirect: '/', // redirect to the secure profile section
					failureRedirect: '/signup', // redirect back to the signup page if there is an error
					failureFlash: true // allow flash messages
				})(req, res);
			} else {
				tools.failRequest(req, res, errors);
			}
		});

	});

	app.get('/signup', function(req, res, next) {
		res.render('signup');
    });
};
