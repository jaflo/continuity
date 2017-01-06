var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var SALT_FACTOR = 10;

var subSchema = mongoose.Schema({
    parent: {
        type: String,
    },
    text: {
        type: String
    }
}, { _id : false });

var userSchema = mongoose.Schema({
	displayname: {
        type: String,
        required: true,
        unique: false,
        maxlength: 32
    },
	emoji: {
        type: String,
        required: true,
        unique: false
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 500
    },
	shortID: {
		type: String,
		required: true,
		unique: true
	},
    password: {
        type: String,
        required: true,
        unique: true,
        minlength: 6
    },
	resetPasswordToken: {
		type: String
	},
	resetPasswordExpires: {
		type: Date
	},
    createdat: {
        type: Date,
        required: true,
        default: Date.now(),
        unique: false
    },
    changedat: {
        type: Date,
        unique: false
    },
    starred: [{
        type: String,
        unique: false
    }],
    incompletestories: [subSchema],
	admin: {
		type: Boolean,
		default: false
	}
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(SALT_FACTOR), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
