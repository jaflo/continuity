module.exports = function(app) {
	require("./actions.js")(app);
	require("./login.js")(app);
	require("./index.js")(app);
};
