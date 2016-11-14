var User = require('../models/user.js');
var Story = require('../models/story.js');

module.exports = function(app) {
    app.get('/', function(req, res, next) {
		load(0, function(stories, story) {
			res.render('index', {
				bodyclass: "longer",
				story: stories,
				currentID: story.shortID,
				date: timeSince(story.changedat),
				ISO8601: story.changedat.toISOString(),
				views: story.views,
				siblings: story.siblings,
				starred: false
			});
		});
    });

    app.get('/:id', function(req, res) {
        var arrayofstories = req.user.incompletestories;                                // find incomplete text from previous session
        var incompletestory;
        for(var i = 0; i < arrayofstories.length; i++) {
            var element = arrayofstories[i];
            if(element.parent == req.params.id) {
                incompletestory = element.text;
                i = arrayofstories.length;
            }
        }
        load(req, req.params.id, function(stories, story) {                             // TODO: Learn if req.user updates continuously, or if we will need to use mongoose to get most current version
            res.render('index', {
                bodyclass: "longer",
                story: stories,
                currentID: story.shortID,
                date: timeSince(story.changedat),
                ISO8601: story.changedat.toISOString(),
                views: story.views,
                siblings: story.siblings,
                starred: req.user && req.user.starred.includes(story.shortID),
                starcount: story.starcount,
                incompletestory: incompletestory
            });
        }, function() {			// consider changing with a failRequest or a redirect to a 404
            res.status(404);
            res.render('404', {
                title: "Page not found"
            });
        });
    });
};

// methods

function getParentStory(req, newStory, storyArray, callback, render) {		//recursively moves up story lineage up to story 0
	if (newStory.shortID != '0') {
		newStory = newStory.toObject();
		newStory["starred"] = req.user && req.user.starred.includes(story.shortID);
		storyArray.unshift(newStory);
		Story.findOne({
			shortID: newStory.parent
		}).exec()
		.then(function(newParentStory) {
			callback(req, newParentStory, storyArray, callback, render);
		}).catch(function(err) {
			console.log('ERROR: Parent story could not be found');
		});
	} else {
		newStory.toObject();
		newStory["starred"] = req.user && req.user.starred.includes(story.shortID);
		storyArray.unshift(newStory);
		render();
	}
}

function load(req, shortID, complete, fail) {								// finds lineage of story
	Story.findOne({                                                         // find initial story
		shortID: shortID
	}).exec().then(function(story) {
		if(story !== null) {                                                // if the story is found...
			Story.update({shortID: shortID}, { $inc: { views: 1 } }).exec()	// ...update the view number -- TODO: find a better way to count views
			.then(function(st) {
				var stories = [];
				var newStory = story;
				getParentStory(req, newStory, stories, getParentStory, function() {         // get an array for the lineage -- getParentStory(req, newStory, storyArray, callback, render);
					Story.count({                                                           // then, find the sibling count
						parent: story.parent
					}).exec()
					.then(function(siblingCount) {
						story = story.toObject();                                           // convert mongoose doc to object
						story.siblings = siblingCount;
						complete(stories, story);
					}).catch(function(err) {                                                // error catching
						console.log('ERROR: Could not find siblings of story ' + story.shortID);
					});
				});
			}).catch(function(err) {
				console.log('ERROR: Unable to update story ' + story.shortID);
			});
		} else {
			console.log('ERROR: Story with shortID ' + shortID + ' not found');
			fail();
		}
	}).catch(function(err) {
		console.log('ERROR: Story with shortID ' + shortID + ' not found');
		fail();
	});
}

function timeSince(date) {													// returns time since date as String
	var seconds = Math.floor((new Date() - date) / 1000);
	var interval = Math.floor(seconds / 31536000);
	if (interval > 1) {
		return interval + " years";
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 1) {
		return interval + " months";
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 1) {
		return interval + " days";
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 1) {
		return interval + " hours";
	}
	interval = Math.floor(seconds / 60);
	if (interval > 1) {
		return interval + " minutes";
	}
	return Math.floor(seconds) + " seconds";
}
