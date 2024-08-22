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
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  files: [
    {
      filename: String,
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      codeHistory: [
        {
          code: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
          author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
    },
  ],
  folders: [
    {
      folderName: String,
      path: String, // Store the full path of the folder/file
      files: [
        {
          filename: String,
          owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          codeHistory: [
            {
              code: String,
              timestamp: {
                type: Date,
                default: Date.now,
              },
              author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            },
          ],
        },
      ],
    },
  ],
});

module.exports = mongoose.model('Room', RoomSchema);