var User = require('../models/user.js');
var Story = require('../models/story.js');
var Flag = require('../models/flag.js');
var tools = require('../config/tools.js');
var ID_LENGTH = 5;
var MIN_LENGTH = 200;
var MAX_LENGTH = 2000;

module.exports = function(app) {
	app.get('/next', function(req, res) {
		req.assert('parent', 'Parent ID is required').notEmpty();
		var errors = req.validationErrors();
		if(errors) {
			tools.failRequest(req, res, errors);
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
						story["starred"] = req.user && req.user.starred.includes(newStory.shortID);
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
		if (!req.user) tools.failRequest(req, res, "Log in to star this story!");
		else if (!req.body.id) tools.failRequest(req, res, "Select a story to star!");
		else if (req.user.starred.includes(req.body.id)) tools.failRequest(req, res, "Story is already starred");
		else {
			Story.findOneAndUpdate({shortID: req.body.id}, {$inc: {'starcount': 1}}).exec()
			.then(function(status) {
				return User.findOneAndUpdate({_id: req.user._id}, {$addToSet: {'starred': req.body.id}})
				.then(function(status) {
					return Story.findOne({shortID: req.body.id}).exec()
					.then(function(story) {
						return story.starcount;
					});
				});
			}).then(function(starcount) {
				tools.completeRequest(req, res, {starred: true}, "back", starcount);
			}).catch(function(err) {
				tools.failRequest(req, res, "Internal Error: Unable to Star");
			});
		}
	});

	app.post('/unstar', function(req, res) {
		if (!req.user) tools.failRequest(req, res, "Log in to star this story!");
		else if (!req.body.id) tools.failRequest(req, res, "Select a story to star!");
		else if (!req.user.starred.includes(req.body.id)) tools.failRequest(req, res, "Story is not starred");
		else {
			Story.findOneAndUpdate({shortID: req.body.id}, {$inc: {starcount: -1}}).exec()
			.then(function(status) {
				return User.findOneAndUpdate({_id: req.user._id}, {$pull: {starred: req.body.id}})
				.then(function(status) {
					return Story.findOne({shortID: req.body.id}).exec()
					.then(function(story) {
						return story.starcount;
					});
				});
			}).then(function(starcount) {
				tools.completeRequest(req, res, {starred: false}, "back", starcount);
			}).catch(function(err) {
				tools.failRequest(req, res, "Internal Error: Unable to Unstar");
			});
		}
	});

	app.post('/create', function(req, res) {
		if (!req.user) {
			tools.failRequest(req, res, "Please log in to create a story!");
		} else {
			req.assert('parent', 'A parent story is required!').notEmpty();
			req.assert('content', 'Please write something').notEmpty();
			req.assert('content', 'Please keep your story between 200 and 2000 characters').isLength({min: MIN_LENGTH, max: MAX_LENGTH});
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
		if(req.user) {
			req.assert('shortID', 'Story ID is required').notEmpty();
			req.assert('reason', 'A reason for flagging is required').notEmpty();
			req.assert('reason', 'Reasons cannot exceed 500 characters').isLength({min: undefined, max: 500});
			var errors = req.validationErrors();
			if(errors) {
				tools.failRequest(req, res, errors);
			} else {
				Flag.findOne({storyShortID: req.body.shortID}).exec()
				.then(function(flag) {
					if(flag == null) {
						var newFlag = new Flag();
						newFlag.storyShortID = req.body.shortID;
						newFlag.flaggings = [{
							reason: req.body.reason,
							flagger: req.user.shortID,
						}];
						newFlag.status = "unresolved";
						newFlag.save(function(err) {
							if(err) {
								console.log(err);
								tools.failRequest(req, res, "Internal Error: Unable to flag");
							}
							else {
								tools.completeRequest(req, res, null, "/story/" + req.body.shortID, "Successfully flagged");
							}
						});
					}
					else {
						var exists = false;
						for(var i = 0; i < flag.flaggings.length; i++) {
							if(flag.flaggings[i].flagger == req.user.shortID) exists = true;
						}
						if(exists) tools.failRequest(req, res, "You've already flagged this story");
						else {
							Flag.findOneAndUpdate(
						        {'storyShortID': req.body.shortID},
						        {$push: {flaggings: {
									reason: req.user.reason,
									flagger: req.user.shortID
								}}},
						        {safe: true, upsert: true, new : true}
						    ).exec()
							.then(function(model) {
								tools.completeRequest(req, res, null, "/story/" + req.body.shortID, "Successfully flagged");
							})
							.catch(function(err) {
								console.log(err);
								tools.failRequest(req, res, "Internal Error: Unable to flag");
							});
						}
					}
				})
				.catch(function(err) {
					console.log(err);
					tools.failRequest(req, res, "Internal Error: Unable to flag");
				});
			}
		} else {
			tools.failRequest(req, res, "Log in to save a story");
		}
	});

	app.post('/delete', function(req, res) {
		if(!req.user) tools.failRequest(req, res, "Log in to delete a story");
		else if(!req.body.shortID) tools.failRequest(req, res, "Provide a story to delete");
		else {
			Story.find({shortID: req.body.shortID}).exec()
			.then(function(story) {
				if(story == null) {
					tools.failRequest(req, res, "This story does not exist");
					return -1;
				} else if(story.auther != req.user.shortID) {
					tools.failRequest(req, res, "You do not have permission to delete this story");
					return -1;
				} else {
					return Story.count({parent: story.shortID}).exec()
					.then(function(count) {
						return count;
					});
				}
			})
			.then(function(count) {
				if(count == -1) return null;
				else if(count != 0) {
					tools.failRequest(req, res, "You cannot delete a story with children");
				} else {
					return Story.remove({shortID: req.body.shortID}).exec()
					.then(function(status) {
						tools.completeRequest(req, res, null, "/story/"+status.parent, "Successfully deleted story");
					});
				}
			});
		}
	});

	app.post('/edit', function(req, res) {
		req.assert('content', 'Please keep your story between 200 and 2000 characters').betweenLengths(MIN_LENGTH, MAX_LENGTH);
		var errors = req.validationErrors();

		if(!req.user) tools.failRequest(req, res, "Log in to delete a story");
		else if(!req.body.shortID) tools.failRequest(req, res, "Provide a story to delete");
		else if(errors) tools.failRequest(req, res, errors);
		else {
			Story.find({shortID: req.body.shortID}).exec()
			.then(function(story) {
				if(story == null) {
					tools.failRequest(req, res, "This story does not exist");
					return -1;
				} else if(story.auther != req.user.shortID) {
					tools.failRequest(req, res, "You do not have permission to edit this story");
					return -1;
				} else {
					return Story.count({parent: story.shortID}).exec()
					.then(function(count) {
						return count;
					});
				}
			})
			.then(function(count) {
				if(count == -1) return null;
				else if(count != 0) {
					tools.failRequest(req, res, "You cannot edit a story with children");
				} else {
					return Story.findOneAndUpdate({shortID: req.body.shortID}, {$set: {'content': req.body.contents}}).exec()
					.then(function(status) {
						tools.completeRequest(req, res, null, "/story/"+status.shortID, "Successfully editted story");
					});
				}
			});
		}
	});
};

function attemptCreation(req, res, shortID) {
	Story.findOne({shortID: shortID }).exec()
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
				if(error) {
					console.log(error);
					tools.failRequest(req, res, "Internal Error: Unable to create story");
				} else {
					var newObject = newStory.toObject();
					newObject["starred"] = false;
					newObject["author"] = {
						id: req.user.shortID,
						display: req.user.displayname,
						emoji: req.user.emoji
					};

					User.findOneAndUpdate(
						{'shortID': req.user.shortID},
						{$pull: {'incompletestories': {'parent': req.body.parent}}}
					).exec()
					.then(function(status) {
						tools.completeRequest(req, res, newObject, '/story/' + shortID, "Save successful!");
					})
					.catch(function(err) {
						console.log(error);
						tools.failRequest(req, res, "Internal Error: Unable to create story");
					});
				}
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
