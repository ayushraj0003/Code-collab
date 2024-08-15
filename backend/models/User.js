const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true, // Automatically convert email to lowercase
        validate: {
            validator: function(value) {
                // Basic email format validation
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: "Please enter a valid email address."
        }
    },
    mobile: {
        type: String,
        required: true,
        validate: {
            validator: function(value) {
                return /^[0-9]{10}$/.test(value);  // Assuming a 10-digit phone number
            },
            message: "Please enter a valid 10-digit mobile number."
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        validate: {
            validator: function(value) {
                // Regex: At least one digit, one special character, and at least 8 characters long
                return /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/.test(value);
            },
            message: "Password must be at least 8 characters long and contain at least one numerical digit and one special character."
        }
    },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.pre('save', function (next) {
    this.email = this.email.toLowerCase();
    next();
});

module.exports = mongoose.model('User', UserSchema);