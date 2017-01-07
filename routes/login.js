var User = require('../models/user.js');
var tools = require('../config/tools.js');
var passport = require('passport');
var simple_recaptcha = require('simple-recaptcha-new');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');

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

	app.get('/forgot', function(req, res, next) {
		res.render('forgot', { user: req.user });
	});

	app.post('/forgot', function(req, res, next) {
		var ip = req.ip; // this is an optional parameter
		var response = req.body['g-recaptcha-response'];

		simple_recaptcha(PRIVATE_KEY, ip, response, function(err) {
			if (err) return tools.failRequest(req, res, err.message);

			function createToken() {
				crypto.randomBytes(20, function(err, buf) {
					if(err) return handleError(err);
					var token = buf.toString('hex');
					setToken(token);
				});
			}

			function setToken(token) {
				User.findOne({ resetPasswordToken: token }).exec()
				.then(function(user) {
					if(user) createToken();
					else {
						User.findOne({ email: req.body.email }).exec()
						.then(function(user) {
							if (!user) {
								tools.failRequest(req, res, 'No account with that email address exists.');
							} else {
								user.resetPasswordToken = token;
								user.changedat = Date.now();

								user.save(function(err) {
									if(err) handleError(err); else sendMail(token, user);
								});
							}
						})
						.catch(function(err) {
							handleError(err);
						});
					}
				})
				.catch(function(err) {
					handleError(err);
				});
			}

			function sendMail(token, user) {
				var auth = {
					auth: {
						api_key: 'key-1a89c47c55776e7eabdf99f6b6551127',
					    domain: 'continuity.loud.red'
					}
				};

				var smtpTransport = nodemailer.createTransport(mg(auth));
				var mailOptions = {
					to: user.email,
					from: 'noreply@continuity.loud.red',
					subject: 'Continuity Password Reset',
					text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
					'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
					'http://' + req.headers.host + '/reset/' + token + '\n\n' +
					'If you did not request this, please ignore this email and your password will remain unchanged.\n'
				};
				smtpTransport.sendMail(mailOptions, function(err) {
					if(err) handleError(err);
					else tools.completeRequest(req, res, null, "/login", "You have been sent an email with further instructions.");
				});
			}

			function handleError(err) {
				console.log(err);
				tools.failRequest(req, res, 'Internal Error: Unable to send email');
			}

			createToken();
		});
	});

	app.get('/reset/:token', function(req, res) {
		User.findOne({ resetPasswordToken: req.params.token }).exec()
		.then(function(user) {
			if (!user) {
				req.flash('error', 'Password reset token is invalid or has expired.');
				return res.redirect('/forgot');
			}
			res.render('reset', { token: req.params.token });
		})
		.catch(function(err) {
			console.log(err);
			return tools.failRequest(req, res, "Internal Error: Unable to search database");
		});
	});

	app.post('/resetpassword', function(req, res, next) {
		function findUser(token) {
			User.findOne({ resetPasswordToken: req.body.token }).exec()
			.then(function(user) {
				req.assert('password', 'Passwords must match').equals(req.body.reentered);
				req.assert('password', 'Passwords must be at least 6 characters long').isLength({min: 6, max: undefined});
				var errors = req.validationErrors();
				if (!user) {
					tools.failRequest(req, res, 'Password reset token is invalid or has expired.');
				} else if(errors) {
					tools.failRequest(req, res, errors);
				} else {
					user.password = user.generateHash(req.body.password);
					user.changedat = Date.now();
					user.resetPasswordToken = undefined;

					user.save(function(err) {
						if(err) handleError(err);
						else {
							sendMail(user);
						}
					});
				}
			})
			.catch(function(err) {
				handleError(err);
			});
		}

		function sendMail(user) {
			var auth = {
				auth: {
					api_key: 'key-1a89c47c55776e7eabdf99f6b6551127',
					domain: 'continuity.loud.red'
				}
			};

			var smtpTransport = nodemailer.createTransport(mg(auth));
			var mailOptions = {
				to: user.email,
				from: 'noreply@continuity.loud.red',
				subject: 'Successfully Reset Password',
				text: 'Hello,\n\n' +
				'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
			};
			smtpTransport.sendMail(mailOptions, function(err) {
				if(err) handleError(err);
				else tools.completeRequest(req, res, null, "/login", "Successfully reset password");
			});
		}

		function handleError(err) {
			console.log(err);
			tools.failRequest(req, res, 'Internal Error: Unable to reset password');
		}

		findUser();
	});

};
