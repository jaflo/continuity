module.exports = function(app, User, Story) {
    app.get('/', function(req, res, next) {
        res.render('index', {
            title: 'Express'
        });
    });

    function getParentStory(newStory, storyArray, callback, render) {
        if (newStory.shortID != '0') {
            storyArray.unshift(newStory);
            Story.findOne({
                shortID: newStory.parent
            }, function(err, newParentStory) {
                if (!err) {
                    callback(newParentStory, storyArray, callback, render);
                } else {
                    console.log('ERROR: Parent story could not be found');
                }
            });
        } else {
            storyArray.unshift(newStory);
            render();
        }
    }

    function load(shortid, complete, fail) {
        Story.findOne({
            shortID: shortid
        }, function(err, story) {
            if (!err && story !== null) {
                Story.update({
                        shortID: shortid
                    }, {
                        $set: {
                            views: story.views + 1
                        }
                    }, {
                        upsert: true
                    },
                    function(err, st) {});
                var stories = [];
                var newStory = story;
                getParentStory(newStory, stories, getParentStory, function() {
                    Story.count({
                        parent: story.parent
                    }, function(err, siblingCount) {
                        if (!err) {
                            story.siblings = siblingCount;
                            complete(stories, story);
                        } else {
                            console.log('ERROR: Could not find siblings of story ' + story.shortID);
                        }
                    });
                });
            } else {
                console.log('ERROR: Story with shortID ' + shortid + ' not found');
                fail();
            }
        });
    }

    app.get('/:id', function(req, res) {
        load(req.params.id, function(stories, story) {
            res.render('index', {
                bodyclass: "longer",
                story: stories,
                currentID: story.shortID,
                date: timeSince(story.changedat),
                ISO8601: story.changedat.toISOString(),
                views: story.views,
                siblings: story.siblings,
                starred: user.starred.includes(story.shortID),
                starcount: story.starcount
            });
        }, function() {														// consider changing with a failRequest or a redirect to a 404
			res.status(404);
			res.render('404', {
				title: "Page not found"
			});
		});
    });
};
