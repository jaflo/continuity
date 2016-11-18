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
			User.find({parent: req.query.parent}).exec()
			.then(function(stories) {
				if(stories.length == 0) {
					tools.failRequest(req, res, 'No more stories left');
				}
				else {
					var index = Math.floor(Math.random()*stories.length);
					tools.completeRequest(req, res, null, '/' + stories[index].shortID, null);
				}
			})
			.catch(function(err) {
				tools.failRequest(req, res, 'Internal Error: Unable to search database');
			});
		}
	});

	app.post('/star', function(req, res) {
		if(!req.user) { res.redirect("back"); }
		Story.findOneAndUpdate({shortID: req.params.id}, {$inc: {starcount: 1}}).exec()
		.then(function(status) {
			return User.findOneAndUpdate({_id: req.user._id}, {$addToSet: {starred: req.params.id}})
			.then(function(status) {
				return status;
			}).catch(function(err){
				tools.failRequest(req, res, "Internal Error: Unable to Star");
			});
		}).then(function(status) {
			tools.completeRequest(req, res, {starred: true}, "back", "Starred");
		}).catch(function(err) {
			tools.failRequest(req, res, "Internal Error: Unable to Star");
		});
	});

	app.post('/unstar', function(req, res) {
		if(!(req.user || req.params.id)) { res.redirect("back"); }									// TODO: do better validation
		Story.findOneAndUpdate({shortID: req.params.id}, {$dec: {starcount: 1}}).exec()
		.then(function(status) {
			return User.findOneAndUpdate({_id: req.user._id}, {$pull: {starred: req.params.id}})
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
	});

	app.post('/create', function(req, res) {
		console.log(req.body);
		req.assert('parent', 'A parent story is required!').notEmpty();
		req.assert('content', 'Please write something').notEmpty();
		var errors = req.validationErrors();
		if(errors) {
			tools.failRequest(req, res, errors);
		}
		else {
			attemptCreation(req, res, randomString(ID_LENGTH));
		}
	});

	app.post('/flag', function(req, res) {															// TODO
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
				author: req.user.email,
				content: req.body.content,
				createdat: Date.now(),
				changedat: Date.now()
			});
			newStory.save(function(error, test) {
				if(error) { tools.failRequest(req, res, "Internal Error: Unable to create story"); }
				var newObject = newStory.toObject();
				newObject["starred"] = false;
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
