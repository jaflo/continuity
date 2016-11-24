var User = require('../models/user.js');
var Story = require('../models/story.js');
var tools = require('../config/tools.js');
/*
Author name, emoji, number of continuations written, continuations, account creation date
*/
module.exports = function(app) {
	app.get('/user/:id', function(req, res) {
		if (req.params.id == "00000") res.redirect("/");
		User.findOne({shortID: req.params.id}).exec()
		.then(function(user) {
			if(!user) {
				res.status(404).render('index', {
					notfound: true,
					currentID: req.params.shortID
				});
			} else {
				Story.find({author: user.shortID}).exec()
				.then(function(stories) {
					if(req.user && req.user.shortID == user.shortID) {}
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
