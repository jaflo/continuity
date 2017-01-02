var User = require('../models/user.js');
var Story = require('../models/story.js');
var tools = require('../config/tools.js');

module.exports = function(app) {
	app.get('/', function(req, res, next) {
		var incompletestory;
		if (req.user) {
			var arrayofstories = req.user.incompletestories; // find incomplete text from previous session
			for(var i = 0; i < arrayofstories.length; i++) {
				var element = arrayofstories[i];
				if(element.parent == "00000") {
					incompletestory = element.text;
					i = arrayofstories.length;
				}
			}
		}
		load(req, res, '00000', function(stories, story) {
			var lastStory = stories[stories.length-1];
			res.render('index', {
				stories: stories,
				currentID: story.shortID,
				storyfragment: incompletestory
			});
		});
    });

	app.get('/help', function(req, res, next) {
		res.render('help');
	});

    app.get('/story/:id', function(req, res, next) {
		if (req.params.id.length !== 5) next();
		else if (req.params.id === '00000') res.redirect('/');
		var incompletestory;
		if (req.user) {
	        var arrayofstories = req.user.incompletestories; // find incomplete text from previous session
	        for(var i = 0; i < arrayofstories.length; i++) {
	            var element = arrayofstories[i];
	            if(element.parent == req.params.id) {
	                incompletestory = element.text;
	                i = arrayofstories.length;
	            }
	        }
		}
        load(req, res, req.params.id, function(stories, story) { // TODO: Learn if req.user updates continuously, or if we will need to use mongoose to get most current version
			var lastStory = stories[stories.length-1];
            stories[stories.length-1].last = true;
			res.render('index', {
				stories: stories,
				currentID: story.shortID,
				storyfragment: incompletestory
			});
        });
    });

	app.post('/savefragment', function(req, res) {
		if(req.user) {
			req.assert('parent', 'Story ID is required').notEmpty();
			var errors = req.validationErrors();
			if(errors) {
				tools.failRequest(req, res, errors);
			} else {
				var found = false;
				for(var i = 0; i < req.user.incompletestories.length; i++) {
					if(req.user.incompletestories[i].parent == req.body.parent) found = true;
				}
				if(found) {
					if(/^[\s\n]*$/.test(req.body.content)) {
						var query = {'shortID': req.user.shortID};
						update = {$pull: {'incompletestories': {'parent': req.body.parent}}};
					} else {
						var query = {'shortID': req.user.shortID, 'incompletestories.parent': req.body.parent};
						var update = {$set: {'incompletestories.$.text': req.body.content}};
					}
					User.findOneAndUpdate(
						query,
						update
					).exec()
					.then(function(status) {
						tools.completeRequest(req, res, null, "back", "Successfully saved fragment");
					})
					.catch(function(err) {
						console.log(err);
						tools.failRequest(req, res, "Internal Error: Unable to save story fragment");
					});
				} else if(!(/^[\s\n]*$/.test(req.body.content))){
					User.findOneAndUpdate(
				        {'shortID': req.user.shortID},
				        {$push: {incompletestories: {parent: req.body.parent, text: req.body.content}}},
				        {safe: true, upsert: true, new : true}
				    ).exec()
					.then(function(model) {
						tools.completeRequest(req, res, null, "back", "Successfully saved fragment");
					})
					.catch(function(err) {
						console.log(err);
						tools.failRequest(req, res, "Internal Error: Unable to save story fragment");
					});
				} else {
					tools.completeRequest(req, res, null, "back", "Successfully saved fragment");
				}
			}
		} else {
			tools.failRequest(req, res, "Log in to save a story");
		}
	});
};

// methods

function getParentStory(req, newStory, storyArray, callback, render) { // recursively moves up story lineage up to story 0
	if (newStory.shortID != '00000') {
		newStory = newStory.toObject();
		newStory["starred"] = req.user && req.user.starred.includes(newStory.shortID);
		Story.findOne({
			shortID: newStory.parent
		}).exec()
		.then(function(newParentStory) {
			return User.findOne({shortID: newStory.author}).exec()
			.then(function(user) {
				return [newParentStory, user];
			});
		})
		.then(function(arr) {
			var newParentStory = arr[0];
			var user = arr[1];
			newStory.author = {
				id: user.shortID,
				display: user.displayname,
				emoji: user.emoji
			};
			newStory.removed = newStory.flagstatus == 2;
			newStory.hidden = newStory.flagstatus == 1;
            newStory.mine = req.user && req.user.shortID == user.shortID;
			storyArray.unshift(newStory);
			callback(req, newParentStory, storyArray, callback, render);
		}).catch(function(err) {
			console.log('ERROR: Parent story could not be found');
			console.log(err);
		});
	} else {
		newStory = newStory.toObject();
		newStory["starred"] = req.user && req.user.starred.includes(newStory.shortID);
		newStory["author"] = {
			id: '00000',
			display: 'Hatchling',
			emoji: "🐣"
		};
        newStory["mine"] = false;
		storyArray.unshift(newStory);
		render();
	}
}

function load(req, res, shortID, complete) { // finds lineage of story
	Story.findOne({ // find initial story
		shortID: shortID
	}).exec().then(function(story) {
		if(story !== null) { // if the story is found...
			Story.update({shortID: shortID}, { $inc: { views: 1 } }).exec() // ...update the view number -- TODO: find a better way to count views
			.then(function(st) {
				var stories = [];
				var newStory = story;
				getParentStory(req, newStory, stories, getParentStory, function() { // get an array for the lineage -- getParentStory(req, newStory, storyArray, callback, render);
					story = story.toObject(); // convert mongoose doc to object
					complete(stories, story);
				});
			});
		} else {
            res.status(404).render('404');
		}
	}).catch(function(err) {
        res.status(404).render('404');
	});
}
