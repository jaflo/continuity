var User = require('../models/user.js');
var Story = require('../models/story.js');
/*
Author name, emoji, number of continuations written, continuations, account creation date
*/
module.exports = function(app) { // oh god im so sorry there's so many if statements
	app.get('/user/:id', function(req, res) {
		User.findOne({shortID: req.params.id}).exec() // find the user
		.then(function(user) {
			if(!user && req.params.id != '00000') { // trying to access a nonexistent user
				res.status(404).render('index', {
					notfound: true,
					currentID: req.params.shortID
				});
			} else if(req.params.id == '00000') { // accessing Hatchling user
				Story.find({shortID: '00000'}).exec()
				.then(function(stories) {
					res.render('profile', {
						display: 'Hatchling',
						emoji: '🐣',
						createdat: stories[0].createdat,
						numberofstories: stories.length,
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
						numberofstories: arr[0].length,
						stories: arr[0],
						starred: arr[1]
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
						numberofstories: stories.length,
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
};
