module.exports = {
	completeRequest: function(req, res, data, redirect, success) {
		if (req.xhr) {
			res.json({
				status: "success",
				message: success,
				data: data
			});
		} else {
			if (success) req.flash("success", success);
			res.redirect(redirect);
		}
		return;
	},

	failRequest: function(req, res, errors) {
		if (!errors) console.warn("Please include a user-friendly error message.");
		if (req.xhr) {
			res.json({
				status: "failed",
				message: errors
			});
		} else {
			req.flash("error", errors);
			res.redirect("back");
		}
		return;
	},

	timeSince: function(date) { // returns time since date as String
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
};
