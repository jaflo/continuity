var User = require('../models/user.js');

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
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	}, function(req, username, password, done) {
		// asynchronous
		// User.findOne wont fire unless data is sent back
		process.nextTick(function() {
			User.findOne({
				'username': username
			}).exec().then(function(err, user) {
				if (user) {
					return done(null, false, req.flash('error', 'That username is already taken'));
				} else {
					var newUser = new User();

					newUser.username = username;
					newUser.password = newUser.generateHash(password);
					newUser.email = req.body.email;
					newUser.createdat = Date.now();
					newUser.changedat = Date.now();

					newUser.save(function(err) {
						if (err && err.code === 11000) {
							return done(null, false, req.flash('error', 'That email is already taken'));
						} else if (err) {
							throw err;
						}
						return done(null, newUser);
					});
				}
			})
			.catch(function(err) {
				return done(err);
			});
		});
	}));

	passport.use('local-login', new LocalStrategy({
		usernameField: 'username', // by default, local strategy uses username and password, we will override with username ( :D )
		passwordField: 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	}, function(req, username, password, done) { // callback with username and password from our form
		User.findOne({
			'username': username
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
