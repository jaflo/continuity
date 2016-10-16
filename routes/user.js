module.exports = function(app) {
	app.get('/user', function(req, res, next) {
 		res.render('index', { title: 'User!!! You\'re so good at this!' });
	});
};
