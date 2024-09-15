const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  codeHistory: [
    {
      code: String,
      title: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
});

const FolderSchema = new mongoose.Schema({
  folderName: String,
  path: String, // Store the full path of the folder
  files: [FileSchema], // Files directly within this folder
  subfolders: [this], // Recursive reference to subfolders
});

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
  files: [FileSchema], // Files directly in the room (not in any folder)
  folders: [FolderSchema], // Top-level folders in the room
});

module.exports = mongoose.model('Room', RoomSchema);
