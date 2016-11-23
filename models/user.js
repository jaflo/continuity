var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var SALT_LEVEL = 10;

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
    incompletestories: [{
        parent: {
            type: String,
            unique: true
        },
        text: {
            type: String
        }
    }]
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(SALT_LEVEL), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


module.exports = mongoose.model('User', userSchema);
