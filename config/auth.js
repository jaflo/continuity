var User = require('../models/user.js');
var ID_LENGTH = 5;

module.exports = function(passport, LocalStrategy) {
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

	passport.use('local-signup', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	}, function(req, email, password, done) {
		// asynchronous
		// User.findOne wont fire unless data is sent back
		process.nextTick(function() {
			req.flash("email", email);
			User.findOne({
				'email': email
			}).exec()
			.then(function(user) {
				if (user) {
					return done(null, false, req.flash('error', 'That email is already registered'));
				} else {
					function randomString(length) {
						return Math.random().toString(36).substr(2, length || ID_LENGTH);
					}

					function attemptCreation(shortID) {
						User.find({shortID: shortID}).exec()
						.then(function(users) {
							if(users.length == 0) {
								var newUser = new User();
								newUser.displayname = req.body.displayname;
								newUser.password = newUser.generateHash(password);
								newUser.email = email;
								newUser.shortID = shortID;
								newUser.emoji = req.body.emoji;
								newUser.createdat = Date.now();
								newUser.changedat = Date.now();

								newUser.save(function(err) {
									if (err) {
										throw err;
									}
									return done(null, newUser);
								});
							} else {
								attemptCreation(randomString(5));
							}
						})
						.catch(function(err) {
							console.log('Error!');
							console.log(err);
							return done(err);
						});
					}
					attemptCreation(randomString(5));
				}
			})
			.catch(function(err) {
				console.log('Error!');
				console.log(err);
				return done(err);
			});
		});
	}));

	passport.use('local-login', new LocalStrategy({
		usernameField: 'email', // by default, local strategy uses username and password, we will override with email
		passwordField: 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	}, function(req, email, password, done) { // callback with username and password from our form
		req.flash("email", email);
		User.findOne({
			'email': email
		}, function(err, user) {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false, req.flash('error', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
			}
			if (!user.validPassword(password)) {
				return done(null, false, req.flash('error', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
			}
			return done(null, user);
		});
	}));
};
