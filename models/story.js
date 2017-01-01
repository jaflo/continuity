var mongoose = require('mongoose');

var storySchema = mongoose.Schema({
	shortID: {
		type: String,
		required: true,
		unique: true
	},
	parent: {
		type: String,
		required: true,
		unique: false
	},
	author: {
		type: String,
		required: true,
		unique: false
	},
	content: {
		type: String,
		required: true,
		unique: false
	},
	createdat: {
		type: Date,
		required: true,
		default: Date.now
	},
	changedat: {
		type: Date,
		required: true,
	},
	views: {
		type: Number,
		required: true,
		default: 0
	},
	starcount: {
		type: Number,
		required: true,
		default: 0
	},
	flagstatus: {
		type: Number,
		required: true,
		default: 0
	}
});

var Story = mongoose.model('Story', storySchema);

module.exports = Story;
