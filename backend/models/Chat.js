const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    roomNo: {
        type: String ,
        required: true,
        ref: 'Room', // References the Room model
    },
    sender: {
        type: String ,
        required: true,
        ref: 'User', // References the User model
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Chat', ChatSchema);
