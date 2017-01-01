var mongoose = require('mongoose');
var flagSchema = mongoose.Schema({
	story: String,
	flaggings: [{
		reason: String,
		flagger: String,
		createdat: {
			type: Date,
			default: Date.now()
		}
	}],
	status: String,
	reason: String,
	processedat: Date
});
module.exports = mongoose.model('Flag', flagSchema);
