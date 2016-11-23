var User = require('../models/user.js');
var Story = require('../models/story.js');
var tools = require('../config/tools.js');
/*
Author name, emoji, number of continuations written, continuations, account creation date
*/
module.exports = function(app) {
	app.get('/user/:id', function(req, res) {
		User.findOne({shortID: req.params.shortID}).exec()
		.then(function(user) {
			if(!user) {
				res.status(404).render('index', {
					notfound: true,
					currentID: shortID
				});
			} else {
				Story.find({author: user.shortID}).exec()
				.then(function(stories) {
					if(req.user && req.user.shortID == user.shortID) {}
					res.render('user', {
						display: user.displayname,
						emoji: user.emoji,
						createdat: user.createdat,
						numberofstories: stories.length,
						stories: stories
					});
				})
				.catch(function(err) {
					console.log(err);
					tools.failRequest(req, res, "Internal Error: Unable to find user");
				});
			}
		})
		.catch(function(err) {
			console.log(err);
			tools.failRequest(req, res, "Internal Error: Unable to find user");
		});
	});
};
