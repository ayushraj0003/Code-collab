const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    codeHistory: [{ // Add this field for version control
      code: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
  });
  

module.exports = mongoose.model('Room', RoomSchema);
