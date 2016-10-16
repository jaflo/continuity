module.exports = function(app, User, Story) {
	require("./user.js")(app);
	require("./main.js")(app, User, Story);
};
