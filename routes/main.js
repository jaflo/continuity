module.exports = function(app) {
	require("./users.js")(app);
	require("./actions.js")(app);
	require("./login.js")(app);
	require("./index.js")(app);
};
