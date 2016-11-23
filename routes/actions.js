var User = require('../models/user.js');
var Story = require('../models/story.js');
var tools = require('../config/tools.js');
var ID_LENGTH = 5;

module.exports = function(app) {
	app.get('/next', function(req, res) {
		req.assert('parent', 'Parent ID is required').notEmpty();
		var errors = req.validationErrors();
		if(errors) {
			tools.failRequest(req, res, 'No parent story!');
		} else {
			Story.find({parent: req.query.parent}).exec()
			.then(function(stories) {
				if(stories.length == 0) {
					tools.failRequest(req, res, 'No more stories left');
				}
				else {
					var story = stories[Math.floor(Math.random()*stories.length)];
					User.findOne({shortID: story.author}).exec()
					.then(function(user) {
						story = story.toObject();
						story["author"] = {
							id: user.shortID,
							display: user.displayname,
							emoji: user.emoji
						};
						tools.completeRequest(req, res, story, '/story/' + story.shortID, "Successfully retrieved story");
					});
				}
			})
			.catch(function(err) {
				tools.failRequest(req, res, 'Internal Error: Unable to search database');
			});
		}
	});

	app.post('/star', function(req, res) {
		if(!(req.user && req.body.id)) { tools.failRequest(req, res, "Log in or select a story to star!"); }
		else if(req.user.starred.includes(req.body.id)) { tools.failRequest(req, res, "Story is already starred"); }
		else {
			Story.findOneAndUpdate({shortID: req.body.id}, {$inc: {starcount: 1}}).exec()
			.then(function(status) {
				return User.findOneAndUpdate({_id: req.user._id}, {$addToSet: {starred: req.body.id}})
				.then(function(status) {
					return status;
				});
			}).then(function(status) {
				tools.completeRequest(req, res, {starred: true}, "back", "Starred");
			}).catch(function(err) {
				tools.failRequest(req, res, "Internal Error: Unable to Star");
			});
		}
	});

	app.post('/unstar', function(req, res) {
		if(!(req.user && req.body.id)) { tools.failRequest(req, res, "Log in or select a story to unstar!"); }
		else if(!req.user.starred.includes(req.body.id)) { tools.failRequest(req, res, "Story is not starred"); }
		else {
			Story.findOneAndUpdate({shortID: req.body.id}, {$inc: {starcount: -1}}).exec()
			.then(function(status) {
				return User.findOneAndUpdate({_id: req.user._id}, {$pull: {starred: req.body.id}})
				.then(function(status) {
					return status;
				}).catch(function(err){
					tools.failRequest(req, res, "Internal Error: Unable to Unstar");
				});
			}).then(function(status) {
				tools.completeRequest(req, res, {starred: false}, "back", "Unstarred");
			}).catch(function(err) {
				tools.failRequest(req, res, "Internal Error: Unable to Unstar");
			});
		}
	});

	app.post('/create', function(req, res) {
		if(!req.user) {
			tools.failRequest(req, res, "Please log in!")
		} else {
			req.assert('parent', 'A parent story is required!').notEmpty();
			req.assert('content', 'Please write something').notEmpty();
			var errors = req.validationErrors();
			if(errors) {
				tools.failRequest(req, res, errors);
			}
			else {
				attemptCreation(req, res, randomString(ID_LENGTH));
			}
		}
	});

	app.post('/flag', function(req, res) { // TODO
		console.log("Unimplemented!");
		res.redirect("back");
	});
};

function attemptCreation(req, res, shortID) {
	Story.findOne({ shortID: shortID }).exec()
	.then(function(story) {
		if(story) {
			attemptCreation(req, res, randomString(ID_LENGTH));
		} else {
			var newStory = new Story({
				shortID: shortID,
				parent: req.body.parent,
				author: req.user.shortID,
				content: req.body.content,
				createdat: Date.now(),
				changedat: Date.now()
			});
			newStory.save(function(error, test) {
				if(error) { tools.failRequest(req, res, "Internal Error: Unable to create story"); }
				var newObject = newStory.toObject();
				newObject["starred"] = false;
				newObject["author"] = {
					id: req.user.shortID,
					display: req.user.displayname,
					emoji: req.user.emoji
				};
				tools.completeRequest(req, res, newObject, '/story/' + shortID, "Save successful!");
			});
		}
	})
	.catch(function(err) {
		console.log(err);
		tools.failRequest(req, res, "Internal Error: Unable to create story");
	});
}

function randomString(length) {
	return Math.random().toString(36).substr(2, length || ID_LENGTH);
}
