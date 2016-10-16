module.exports = function(app, User, Story) {
    require("./main.js")(app, User, Story);
    require("./user.js")(app);
};
