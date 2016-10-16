module.exports = function(app) {
    require('./main.js')(app);
    require('./user.js')(app);
};
