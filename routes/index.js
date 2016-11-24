var User = require('../models/user.js');
var Story = require('../models/story.js');
var tools = require('../config/tools.js');

module.exports = function(app) {
    app.get('/', function(req, res, next) {
		load(req, res, '00000', function(stories, story) {
			var lastStory = stories[stories.length-1];
			res.render('index', {
				stories: stories,
				currentID: story.shortID
			});
		});
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
			res.render('index', {
				stories: stories,
				currentID: story.shortID
			});
        });
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
            res.status(404).render('index', {
				notfound: true,
				currentID: shortID
			});
		}
	}).catch(function(err) {
        res.status(404).render('index', {
            notfound: true,
            currentID: shortID
        });
	});
}
