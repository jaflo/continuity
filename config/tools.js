module.exports = {
	completeRequest: function(req, res, data, redirect, success) {
		console.log({
			status: "success",
			message: success,
			data: data || false
		});
		if (req.xhr) {
			res.json({
				status: "success",
				message: success,
				data: data || false
			});
		} else {
			if (success) req.flash("success", success);
			res.redirect(redirect || "back");
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
	}
};
