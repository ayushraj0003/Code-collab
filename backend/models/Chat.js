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
    receiver: {
        type:String,
        ref: 'User',
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    type: { // New field to distinguish chat type
        type: String,
        enum: ['group', 'personal'], // Ensure only 'group' or 'personal' values
        default: 'group', // Default to 'group'
    }
});

module.exports = mongoose.model('Chat', ChatSchema);
