var User = require('../models/user.js');
var Story = require('../models/story.js');
var tools = require('../config/tools.js');
/*
Author name, emoji, number of continuations written, continuations, account creation date
*/
module.exports = function(app) { // oh god im so sorry there's so many if statements
	app.get('/user/:id', function(req, res) {
		User.findOne({shortID: req.params.id}).exec() // find the user
		.then(function(user) {
			if(!user && req.params.id != '00000') { // trying to access a nonexistent user
				res.status(404).render('404');
			} else if(req.params.id == '00000') { // accessing Hatchling user
				Story.find({shortID: '00000'}).exec()
				.then(function(stories) {
					res.render('profile', {
						display: 'Hatchling',
						emoji: '🐣',
						createdat: stories[0].createdat,
						stories: stories
					});
				})
				.catch(function(err) {
					console.log(err);
					res.render('profile', { notfound: true });
				});
			} else if(req.user && req.user.shortID == user.shortID) { // accessing your own page (should show starred)
				Story.find({author: user.shortID}).exec()
				.then(function(stories) {
					return Story.find({
						shortID: {
							$in: req.user.starred
						}
					}).exec()
					.then(function(starred) {
						return [stories, starred];
					});
				})
				.then(function(arr) {
					res.render('profile', {
						display: user.displayname,
						emoji: user.emoji,
						createdat: user.createdat,
						stories: arr[0],
						starred: arr[1],
						seestars: true
					});
				})
				.catch(function(err) {
					console.log(err);
					res.render('profile', { notfound: true });
				});

			} else { // accessing a user page that is not your own
				Story.find({author: user.shortID}).exec()
				.then(function(stories) {
					res.render('profile', {
						display: user.displayname,
						emoji: user.emoji,
						createdat: user.createdat,
						stories: stories
					});
				})
				.catch(function(err) {
					console.log(err);
					res.render('profile', { notfound: true });
				});
			}
		})
		.catch(function(err) {
			console.log(err);
			res.render('profile', { notfound: true });
		});
	});

	app.post("/user/update", function(req, res) {
		req.assert('emoji', 'You have to have an emoji.').notEmpty().isEmoji();
		req.assert('displayname', 'You need some name.').notEmpty();
		var errors = req.validationErrors();

		if (!req.user) tools.failRequest(req, res, "Log in to update your profile");
		else if(errors) tools.failRequest(req, res, errors);
		else {
			User.findOneAndUpdate({_id: req.session.passport.user}, {$set: {
				"emoji": req.body.emoji,
				"displayname": req.body.displayname
			}}).exec().then(function(status) {
				tools.completeRequest(req, res, null, "/user/"+req.user.shortID, "Successfully updated profile!");
			}).catch(function(err) {
				console.log(err);
				tools.failRequest(req, res, "Internal Error: Unable to update profile");
			});;
		}
	});
};
