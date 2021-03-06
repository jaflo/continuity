var User = require('../models/user.js');
var Story = require('../models/story.js');
var Flag = require('../models/flag.js');
var tools = require('../config/tools.js');

var statusMap = ["flagged", "hidden", "removed", "dismissed"];

module.exports = function(app) {
	app.get('/flag', function(req, res) {
		if(!(req.user && req.user.admin)) res.status(404).render('404');
		else {
			Flag.find({}).exec()
			.then(function(arr) {
				for (var i = 0; i < arr.length; i++) {
					arr[i] = arr[i].toObject();
					arr[i].status = statusMap[arr[i].status];
				}
				res.render('flag', {
					flags: arr
				});
			})
			.catch(function(err) {
				console.log(err);
				tools.failRequest(req, res, "Internal Error: Unable to load page");
			});
		}
	});

	app.get('/flag/:id', function(req, res) {
		if(!(req.user && req.user.admin)) res.status(404).render('404');
		else {
			Flag.findOne({ story: req.params.id }).exec()
			.then(function(flag) {
				if(flag == null) {
					res.status(404).render('404');
					return;
				}
				return flag.toObject();
			})
			.then(function(flag) {
				if(flag == null) return null;
				else {
					return Story.findOne({ shortID: req.params.id }).exec()
					.then(function(story) {
						if (story == null) return null; // story does not exist anymore
						flag.story = story.toObject();
						return flag;
					});
				}
			})
			.then(function(flag) {
				if(flag == null) return null;
				else {
					return User.findOne({ shortID: flag.story.author }).exec()
					.then(function(user) {
						flag.user = user.toObject();
						return flag;
					});
				}
			})
			.then(function(flag) {
				if(flag == null) return null;
				else {
					flag.status = statusMap[flag.status];
					res.render('individualflag', flag);
				}
			})
			.catch(function(err) {
				console.log(err);
				tools.failRequest(req, res, "Internal Error: Unable to load page");
			});
		}
	});


	app.post('/flag', function(req, res) { // TODO
		req.assert('shortID', 'Story ID is required').notEmpty();
		req.assert('reason', 'A reason for flagging is required').notEmpty();
		req.assert('reason', 'Reasons cannot exceed 500 characters').isLength({min: undefined, max: 500});
		var errors = req.validationErrors();
		if(!req.user) tools.failRequest(req, res, "Log in to flag a story");
		else if(errors) tools.failRequest(req, res, errors);
		else if (req.body.shortID == "00000") tools.failRequest(req, res, "You can't flag that, silly");
		else {
			Flag.findOne({story: req.body.shortID}).exec()
			.then(function(flag) {
				if(flag == null) { // if this is the first flag
					Story.count({shortID: req.body.shortID}).exec()
					.then(function(count) { // ensure the story exists
						if(count == 0) tools.failRequest(req, res, "Story does not exist");
						else {
							var newFlag = new Flag(); // create and save the new flag
							newFlag.story = req.body.shortID;
							newFlag.flaggings = [{
								reason: req.body.reason,
								flagger: req.user.shortID,
							}];
							newFlag.status = 0;
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
					})
					.catch(function(err) {
						console.log(err);
						tools.failRequest(req, res, "Internal Error: Unable to flag");
					});
				}
				else { // if a flag already exists for the story, update it
					var exists = false;
					for(var i = 0; i < flag.flaggings.length; i++) {
						if(flag.flaggings[i].flagger == req.user.shortID) exists = true;
					}
					if(exists) tools.failRequest(req, res, "You've already flagged this story"); // users cannot flag a story more than once
					else if(flag.status == 3) tools.failRequest(req, res, "This story has already been removed.");
					else if(flag.status == 4) tools.failRequest(req, res, "This story has already been reviewed to be good.");
					else {
						Flag.findOneAndUpdate(
							{story: req.body.shortID},
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
	});

	app.post('/flag/process', function(req, res) {
		req.assert('status', 'Flag status required').notEmpty();
		req.assert('shortID', 'Story shortID required').notEmpty();
		req.assert('reason', 'Decision reason required').notEmpty();
		var errors = req.validationErrors();
		if(!(req.user && req.user.admin)) tools.failRequest(req, res, "You must log into an admin account to process flags.");
		else if(errors) tools.failRequest(req, res, errors);
		else {
			var flagchanges = {$set: {status: 0, processedat: Date.now(), reason: req.body.reason, reviewer: req.user.shortID}};
			var storychanges = {$set: {flagstatus: 0, changedat: Date.now()}};
			var continu = true;
			if(req.body.status == "violence") {
				flagchanges["$set"].status = 1;
				storychanges["$set"].flagstatus = 1;
			} else if(req.body.status == "nudity") {
				flagchanges["$set"].status = 2;
				storychanges["$set"].flagstatus = 2;
			} else if(req.body.status == "remove") {
				flagchanges["$set"].status = 3;
				storychanges["$set"].flagstatus = 3;
				storychanges["$set"]["content"] = "[FLAGGED]";
			} else if(req.body.status == "dismiss") {
				flagchanges["$set"].status = 4;
				storychanges["$set"].flagstatus = 4;
			} else continu = false;
			if(continu) {
				Story.count({ shortID: req.body.shortID }).exec()
				.then(function(count) {
					if(count == 0) {
						tools.failRequest(req, res, "Story does not exist");
						return null;
					}
					else return 1;
				})
				.then(function(status) {
					if(status) {
						return Story.findOneAndUpdate({ shortID: req.body.shortID }, storychanges).exec()
						.then(function(status) {
							return 1;
						});
					} else return null;
				})
				.then(function(status) {
					if(status) {
						return Flag.findOneAndUpdate({ story: req.body.shortID }, flagchanges).exec()
						.then(function(status) { return 1; } );
					} else return null;
				})
				.then(function(status) {
					if(status) tools.completeRequest(req, res, null, "/flag/"+req.body.shortID, "Successfully processed flag");
				})
				.catch(function(err) {
					console.log(err);
					tools.failRequest(req, res, "Internal Error: Unable to process flag.");
				});
			} else tools.failRequest(req, res, "Insert a valid status");
		}
	});
};
