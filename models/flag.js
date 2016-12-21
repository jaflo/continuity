var mongoose = require('mongoose');
var flagSchema = mongoose.Schema({
	storyShortID: String,
	flaggings: [{
		reason: String,
		flagger: String,
		createdat: {
			type: Date,
			default: Date.now()
		}
	}],
	status: String,
	processedat: Date
});
module.exports = mongoose.model('Flag', flagSchema);
