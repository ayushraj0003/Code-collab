const express = require('express');
const crypto = require('crypto'); // Import crypto module
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios=require('axios')
const mongoose = require('mongoose'); 
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();
const { verifyRoomAccess } = require('../middleware/roomAccess');


function verifyToken(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        console.log("Authorization header missing");
        return res.status(401).json({ message: 'Access Denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Extract token from the header
    console.log("Token:", token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
        console.log("Decoded token:", decoded);
        req.user = decoded; // Attach user payload to request object
        next();
    } catch (err) {
        console.log("Token verification failed:", err.message);
        res.status(400).json({ message: 'Invalid Token' });
    }
}


// Function to generate a unique room ID
async function generateUniqueRoomId() {
  let roomId;
  let roomExists = true;

  while (roomExists) {
    roomId = crypto.randomBytes(3).toString('hex'); // Generates a random 6-character hex string
    roomExists = await Room.findOne({ roomId }); // Check if the room ID already exists
  }

  return roomId;
}

// Room creation route
router.post('/create', verifyToken, async (req, res) => {
    console.log("Request received at /create");  // Initial debug log

    const { roomName } = req.body;
    console.log("Room Name:", roomName);  // Log incoming data

    // Check if roomName is present
    if (!roomName || roomName.trim() === '') {
      console.log("Room name is missing");
      return res.status(400).json({ message: 'Room name is required' });
    }

    try {
      // Generate a unique room ID
      const roomId = await generateUniqueRoomId();

      // Create a new room and associate it with the user ID
      const newRoom = new Room({
        roomId,
        userId: req.user.userId, // Extracted from the token
        roomName,
        users:req.user.userId
      });

      // Save the room to the database
      await newRoom.save();

      console.log("Room created successfully:", roomId, roomName);
      res.status(201).json({ message: 'Room created', roomId, roomName });
    } catch (err) {
      console.error("Error creating room:", err.message);
      res.status(500).json({ message: 'Server error' });
    }
});

router.post('/join', verifyToken, async (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
        return res.status(400).json({ message: 'Room ID is required' });
    }

    try {
        // Find the room by ID
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Add the user to the room (e.g., store user ID in the room's user list)
        // Assuming you have a `users` array in the room schema
        if (!room.users.includes(req.user.userId)) {
            room.users.push(req.user.userId);
            await room.save();
        }

        res.status(200).json({ message: 'Joined the room successfully', room });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/my-rooms', verifyToken, async (req, res) => {
  try {
      // Fetch all rooms where the user is the owner or a member
      const rooms = await Room.find({
          $or: [{ userId: req.user.userId }, { users: req.user.userId }]
      });

      res.status(200).json(rooms);
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
  }
});

// Example in Express.js
router.get('/:roomId/users', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const room = req.room; // Already verified by middleware
    res.status(200).json(room);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/save-code', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { code } = req.body;
    const room = req.room;
    
    // Save the current version of the code
    room.codeHistory.push({ code, date: new Date() });
    await room.save();

    res.status(200).json({ message: 'Code saved successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    console.log(`User ${userId} requesting access to room ${roomId}`);
    
    // Find the room by its roomId
    const room = await Room.findOne({ roomId })
      .populate({
        path: 'users',  
        select: 'name avatar', 
      })
      .populate('folders.files.owner', 'name');

    if (!room) {
      console.log(`Room ${roomId} not found`);
      return res.status(404).json({ 
        success: false,
        message: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
    }

    // Verify user access
    const isOwner = room.userId.toString() === userId.toString();
    const isMember = room.users.some(user => user._id.toString() === userId.toString());

    if (!isOwner && !isMember) {
      console.log(`Access denied for user ${userId} to room ${roomId}`);
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to access this room',
        code: 'ACCESS_DENIED'
      });
    }

    console.log(`Access granted for user ${userId} to room ${roomId}`);
    
    // Respond with room data including folders and files
    res.status(200).json({
      success: true,
      ...room.toObject(),
      isOwner,
      currentUserId: userId
    });
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Example Node.js/Express authorization middleware
const isRoomOwner = async (req, res, next) => {
  const room = await Room.findById(req.params.roomId);
  if (!room || room.userId !== req.user._id) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
  }
  next();
};

// Route to remove a user from a room
// Example route in Express.js
router.delete('/:roomId/remove-user/:removeId', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { roomId, removeId } = req.params;
    console.log(roomId);
    console.log(removeId);
    // Ensure `userId` is a valid ObjectId
    // if (!mongoose.Types.ObjectId.isValid(removeId)) {
    //   return res.status(400).json({ message: 'Invalid user ID format.' });
    // }
    const room = await Room.findOne({roomId});
    
    console.log("hello");
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    // Check if the user making the request is the owner
    if (req.user.userId !== room.userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }
    console.log("here");
    // Remove the user from the room's users array
    room.users = room.users.filter(user => user.toString() !== removeId); // Convert ObjectId to string for comparison
    console.log("noew here");
    await room.save();

    res.json({ message: 'User removed successfully.' });
  } catch (error) {
    console.error('Error removing user from room:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/:roomId/change-owner/:newOwnerId', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { roomId, newOwnerId } = req.params;
    console.log(newOwnerId)
    // Ensure `userId` is a valid ObjectId
    // if (!mongoose.Types.ObjectId.isValid(removeId)) {
    //   return res.status(400).json({ message: 'Invalid user ID format.' });
    // }
    const room = await Room.findOne({roomId});
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    // Check if the user making the request is the owner
    if (req.user.userId !== room.userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to change the owner ' });
    }
   
    // Remove the user from the room's users array
    room.userId=newOwnerId; // Convert ObjectId to string for comparison

    await room.save();

    res.json({ message: 'User removed successfully.' });
  } catch (error) {
    console.error('Error removing user from room:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
router.delete('/delete/:roomId', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if the current user is the owner of the room
    if (room.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this room' });
    }

    await Room.deleteOne({ roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete room', error: err.message });
  }
}); 

// Add this import at the top


// Apply the middleware to all routes that need room access
router.get('/:roomId/users', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const room = req.room; // Already verified by middleware
    res.status(200).json(room);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/save-code', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { code } = req.body;
    const room = req.room;
    
    // Save the current version of the code
    room.codeHistory.push({ code, date: new Date() });
    await room.save();

    res.status(200).json({ message: 'Code saved successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:roomId/file/:path/:filename', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { filename } = req.params;
    const paths = decodeURIComponent(req.params.path);
    const room = req.room;

    const folderPaths = paths.split('/').filter(Boolean);
    let currentFolder = room.folders;
    let folder;

    for (const folderName of folderPaths) {
      folder = currentFolder.find((f) => f.folderName === folderName);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }
    }

    const file = folder.files.find((file) => file.filename === filename);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const latestCode = file.codeHistory.length > 0 ? file.codeHistory[file.codeHistory.length - 1].code : '';
    const latestAuth = file.codeHistory.length > 0 ? file.codeHistory[file.codeHistory.length - 1].author : '';

    res.status(200).json({ content: latestCode, latestAuth, codeHistory: file.codeHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/upload-file', verifyToken, verifyRoomAccess, upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Ensure the `files` array exists
    if (!room.files) {
      room.files = [] ; // Initialize the array if it doesn't exist
    }


    const { originalname, buffer } = req.file;
    const content = buffer.toString('utf-8'); // Convert file buffer to string

    console.log('Before:', room.files); // Log before pushing

    const newFile = {
      filename: originalname,
      owner: req.user.userId, // Assuming req.user.userId is available from verifyToken middleware
      codeHistory: [{
        code: content,
        author: req.user.userId,
      }],
    };

    // Push the new file to the files array
    room.files.push(newFile);

    console.log('After:', room.files); // Log after pushing
    console.log("hi ");

    await room.save();
    console.log('Room saved successfully with files:', room.files);
    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/commit', verifyToken, verifyRoomAccess, async (req, res) => {
  const { filename, newContent } = req.body;

  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const file = room.files.find(f => f.filename === filename);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Add the new code version to the file's version history
    file.codeHistory.push({
      code: newContent,
      author: req.user.userId , // Assuming `req.user.id` contains the user ID of the author
    });

    await room.save();

    res.status(200).json({ message: 'Code committed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:roomId/folder-file', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { folderPath, filename } = req.query;

    console.log('Received folderPath:', folderPath);  // Log received path
    console.log('Received filename:', filename);  // Log received filename

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Log all folder paths in the room for comparison
    console.log('Available folder paths:', room.folders.map(folder => folder.path));

    // Decode folderPath to handle any URL encoding
    const decodedFolderPath = decodeURIComponent(folderPath);
    console.log('Decoded folderPath:', decodedFolderPath);  // Log decoded path

    // Find the folder by decoded path
    const folder = room.folders.find(folder => folder.path === decodedFolderPath);

    if (!folder) {
      console.log('Folder not found for path:', decodedFolderPath);  // Log failure
      return res.status(404).json({ message: 'Folder not found' });
    }

    const file = folder.files.find(file => file.filename === filename);

    if (!file) {
      console.log('File not found in folder');  // Log file not found
      return res.status(404).json({ message: 'File not found' });
    }

    const latestCode = file.codeHistory.length > 0
      ? file.codeHistory[file.codeHistory.length - 1].code
      : '';

    const latestAuth = file.codeHistory.length > 0
      ? file.codeHistory[file.codeHistory.length - 1].author
      : '';

    res.status(200).json({ content: latestCode, latestAuth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/commit-folder-file', verifyToken, verifyRoomAccess, async (req, res) => {
  const { folderPath, filename, newContent } = req.body;

  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const folder = room.folders.find(f => f.path === folderPath);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const file = folder.files.find(f => f.filename === filename);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Add the new code version to the file's version history
    file.codeHistory.push({
      code: newContent,
      author: req.user.userId, // Assuming `req.user.userId` contains the user ID of the author
    });

    await room.save();

    res.status(200).json({ message: 'Code committed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/upload-folder', verifyToken, verifyRoomAccess, upload.array('files'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const folderStructure = JSON.parse(req.body.folderStructure);  // Parse folderStructure from the request body

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Validate that folderStructure is an object
    if (typeof folderStructure !== 'object' || folderStructure === null) {
      return res.status(400).json({ message: 'Invalid folder structure' });
    }

    const processFolder = (folderData, folderPath) => {
      console.log(`Processing folder: ${folderPath}`);  // Log the current folder path

      if (Array.isArray(folderData.files)) {
        console.log(`Files in ${folderPath}:`, folderData.files.map(f => f.name));  // Log files in the current folder

        // Process files within the current folder
        const files = folderData.files.map((fileData) => {
          const fileBuffer = req.files.find(f => f.originalname === fileData.name).buffer;

          console.log(`Processing file: ${fileData.name}`);  // Log the current file being processed

          return {
            filename: fileData.name,
            owner: req.user.userId,
            codeHistory: [
              {
                code: fileBuffer.toString('utf-8'),
                author: req.user.userId,
              },
            ],
          };
        });

        room.folders.push({
          folderName: folderPath.split('/').pop(), // Extract folder name from path
          path: folderPath, // Store full folder path
          files,
        });
      }

      // Recursively process subfolders
      Object.keys(folderData).forEach(subFolder => {
        if (subFolder !== 'files') {
          console.log(`Entering subfolder: ${subFolder}`);  // Log entering a subfolder
          processFolder(folderData[subFolder], `${folderPath}/${subFolder}`);
        }
      });
    };

    // Start processing from the root of the folder structure
    Object.keys(folderStructure).forEach((folder) => {
      console.log(`Starting to process root folder: ${folder}`);  // Log the root folder
      processFolder(folderStructure[folder], folder);
    });

    console.log('All folders and files processed successfully');  // Log after all processing is done

    await room.save();
    res.status(200).json({ message: 'Folder uploaded successfully' });
  } catch (err) {
    console.error('Error processing folder upload:', err);  // Log any errors that occur
    res.status(500).json({ message: 'Server error' });
  }
});



router.get('/:roomId/folder-file', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { folderPath, filename } = req.query;

    console.log('Received folderPath:', folderPath);  // Log received path
    console.log('Received filename:', filename);  // Log received filename

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Log all folder paths in the room for comparison
    console.log('Available folder paths:', room.folders.map(folder => folder.path));

    // Decode folderPath to handle any URL encoding
    const decodedFolderPath = decodeURIComponent(folderPath);
    console.log('Decoded folderPath:', decodedFolderPath);  // Log decoded path

    // Find the folder by decoded path
    const folder = room.folders.find(folder => folder.path === decodedFolderPath);

    if (!folder) {
      console.log('Folder not found for path:', decodedFolderPath);  // Log failure
      return res.status(404).json({ message: 'Folder not found' });
    }

    const file = folder.files.find(file => file.filename === filename);

    if (!file) {
      console.log('File not found in folder');  // Log file not found
      return res.status(404).json({ message: 'File not found' });
    }

    const latestCode = file.codeHistory.length > 0
      ? file.codeHistory[file.codeHistory.length - 1].code
      : '';

    const latestAuth = file.codeHistory.length > 0
      ? file.codeHistory[file.codeHistory.length - 1].author
      : '';

    res.status(200).json({ content: latestCode, latestAuth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/github-upload', verifyToken, verifyRoomAccess, async (req, res) => {
  const { repoUrl } = req.body;
  const { roomId } = req.params;

  try {
    const files = await getGitHubFiles(repoUrl);
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    for (const file of files) {
      if (file.type === 'file') {
        const fileContent = Buffer.from(file.content, 'base64').toString('utf-8');

        room.files.push({
          filename: file.name,
          owner: req.user._id, // Assuming the requesting user is the owner
          codeHistory: [{
            code: fileContent,
            author: req.user._id, // Assuming the requesting user is the author
          }],
        });
      }
    }

    await room.save();
    res.status(200).json({ files: room.files, folders: room.folders });
  } catch (err) {
    console.error(`Error uploading files: ${err.message}`);
    res.status(500).json({ message: 'Failed to upload files from GitHub repository.' });
  }
});

router.delete('/:roomId/leave', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    console.log(roomId)
    console.log(userId)

    const room = await Room.findOne({roomId});

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // If the user is the owner and no new owner is assigned, block leaving
    if (room.userId.toString() === userId.toString()) {
      return res.status(403).json({ message: 'You must transfer ownership before leaving the room' });
    }

    room.users = room.users.filter((id) => id.toString() !== userId);
    await room.save();

    res.json({ message: 'You have left the room' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to leave the room' });
  }
});
router.get('/:roomId/owner', verifyToken, async (req, res) => {
  try {
    const {roomId}=req.params;
    const room = await Room.findOne({roomId});

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if the logged-in user is the owner of the room
    const owner = room.userId.toString() === req.user.userId;

    return res.status(200).json({ owner });
  } catch (error) {
    console.error("Error checking room owner:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post('/:roomId/file/:paths/:filename/commit', verifyToken, verifyRoomAccess, async (req, res) => {
  try {
    const author =req.user.userId;
    console.log("Starting commit process...");
    const { roomId, filename } = req.params;
    const paths = decodeURIComponent(req.params.paths);
    const { code, title } = req.body;
    console.log(`Room ID: ${roomId}, Paths: ${paths}, Filename: ${filename}, Code: ${code}`);

    // Find the room by roomId
    const room = await Room.findOne({ roomId });
    if (!room) {
      console.log('Room not found.');
      return res.status(404).json({ message: 'Room not found' });
    }


    const folder = room.folders.find((f) => f.path === paths);

    if (!folder) {
      console.log(`Folder with path "${folderPath}" not found.`);
      return res.status(404).json({ message: 'Folder not found' });
    }


    console.log('Target folder found:', folder);

    // Find the file within the found folder
    const file = folder.files.find((file) => file.filename === filename);
    if (!file) {
      console.log(`File "${filename}" not found in folder "${folder.folderName}".`);
      return res.status(404).json({ message: 'File not found' });
    }

    console.log('File found:', file.filename);

    // Update the file's content
    file.codeHistory.push({
      code, 
      title,  
      timestamp: new Date(),
      author
    });

    // Save the room document with the updated file history
    await room.save();

    res.status(200).json({ message: 'Code committed successfully', codeHistory: file.codeHistory });
  } catch (error) {
    console.error('Error during commit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:roomId/file/:folderPath/:filename', verifyToken, verifyRoomAccess, async (req, res) => {
  const { roomId, filename } = req.params;
  const folderPath = decodeURIComponent(req.params.folderPath); // Full folder path
  console.log(roomId, filename, folderPath);

  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      console.log('Room not found.');
      return res.status(404).json({ message: 'Room not found' });
    }

    // Find the folder using the full folder path
    const targetFolder = room.folders.find((f) => f.path === folderPath);

    if (!targetFolder) {
      console.log(`Folder with path "${folderPath}" not found.`);
      return res.status(404).json({ message: 'Folder not found' });
    }

    console.log('Target folder found:', targetFolder);

    // Find the file in the target folder
    const fileIndex = targetFolder.files.findIndex((file) => file.filename === filename);
    if (fileIndex === -1) {
      console.log(`File "${filename}" not found in folder "${targetFolder.folderName}".`);
      return res.status(404).json({ message: 'File not found' });
    }

    console.log('File found:', targetFolder.files[fileIndex].filename);

    // Delete the file from the files array
    targetFolder.files.splice(fileIndex, 1);

    // Save the updated room document
    await room.save();

    console.log(`File "${filename}" deleted successfully.`);
    res.status(200).send({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'An error occurred while deleting the file.' });
  }
});

router.post('/move-file', async (req, res) => {
  const { roomId, fileId, oldFolderPath, newFolderPath } = req.body;
  console.log("Move File Request:", oldFolderPath, newFolderPath, roomId, fileId);
  
  try {
    // Find the room by roomId
    const room = await Room.findOne({ roomId });
    if (!room) {
      console.log('Room not found.');
      return res.status(404).json({ message: 'Room not found' });
    }
    console.log(room)
    console.log(room.folders )
    // Function to find the folder by its path (no subfolders considered)
    const findFolder = (folderName, folders) => {
      return folders.find((f) => f.path=== folderName);
    };

    // Find the old folder and remove the file from there
    const oldFolder = findFolder(oldFolderPath, room.folders);
    console.log(oldFolder)
    if (!oldFolder) {
      console.log(`Old folder "${oldFolderPath}" not found.`);
      return res.status(404).json({ message: 'Old folder not found' });
    }

    const fileIndex = oldFolder.files.findIndex((file) => file._id.toString() === fileId);
    if (fileIndex === -1) {
      console.log('File not found in the old folder.');
      return res.status(404).json({ message: 'File not found in old folder' });
    }

    const [file] = oldFolder.files.splice(fileIndex, 1); // Remove the file

    // Find the new folder and add the file there
    const newFolder = findFolder(newFolderPath, room.folders);
    if (!newFolder) {
      console.log(`New folder "${newFolderPath}" not found.`);
      return res.status(404).json({ message: 'New folder not found' });
    }

    newFolder.files.push(file); // Add the file to the new folder

    // Save the room document
    await room.save();

    res.status(200).json({ message: 'File moved successfully' });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Error moving file' });
  }
});

router.delete('/:roomId/folder/:folderPath', verifyToken, verifyRoomAccess, async (req, res) => {
  const { roomId } = req.params;
  const folderPath = decodeURIComponent(req.params.folderPath); // Full folder path

  try {
    // Find the room
    const room = await Room.findOne({ roomId });
    if (!room) {
      console.log('Room not found.');
      return res.status(404).json({ message: 'Room not found' });
    }

    // Filter out folders to delete
    const foldersToDelete = new Set(); // To store the paths of folders to delete
    const remainingFolders = room.folders.filter(folder => {
      if (folder.path.startsWith(folderPath)) {
        foldersToDelete.add(folder.path);
        return false; // Remove this folder
      }
      return true; // Keep this folder
    });

    if (foldersToDelete.size === 0) {
      console.log(`Folder with path "${folderPath}" not found.`);
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Update the room's folders list
    room.folders = remainingFolders;

    // Save the updated room document
    await room.save();

    console.log('Folder and its subfolders deleted successfully.');
    res.status(200).json({ message: 'Folder and its subfolders deleted successfully' });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Renaming a file
router.put('/:roomId/file/:folderPath', async (req, res) => {
  try {
    const { roomId, folderPath } = req.params;
    const { newName } = req.body;

    // Find and rename the file in the database
    const result = await File.updateOne(
      { roomId, path: folderPath, filename: req.body.currentName },
      { $set: { filename: newName } }
    );

    if (result.nModified === 0) {
      return res.status(404).send('File not found');
    }

    res.send('File renamed successfully');
  } catch (error) {
    res.status(500).send('Server error');
  }
});

router.put('/:roomId/folder/:folderPath', async (req, res) => {
  try {
    const { roomId, folderPath } = req.params;
    const { newName } = req.body;

    // Decode folderPath to handle URL encoding
    const decodedFolderPath = decodeURIComponent(folderPath);

    // Find the room
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).send('Room not found');
    }

    // Find the folder to rename
    const folderToRename = room.folders.find(folder => folder.path === decodedFolderPath);
    if (!folderToRename) {
      return res.status(404).send('Folder not found');
    }

    const oldFolderName = folderToRename.folderName;

    // Update the folder name
    folderToRename.folderName = newName;

    // Update paths of subfolders
    const updatedFolders = room.folders.map(folder => {
      if (folder.path.startsWith(decodedFolderPath)) {
        // Update the folder path by replacing the old folder name with the new name
        const updatedPath = folder.path.replace(`${decodedFolderPath}`, `${decodedFolderPath.replace(oldFolderName, newName)}`);
        return { ...folder, path: updatedPath };
      }
      return folder;
    });

    // Save the updated room document
    room.folders = updatedFolders;
    await room.save();

    res.send('Folder renamed successfully');
  } catch (error) {
    console.error('Error renaming folder:', error);
    res.status(500).send('Server error');
  }
});

router.put('/:roomId/file/:folderPath/file/:fileName', async (req, res) => {
  try {
    const { roomId, folderPath, fileName } = req.params;
    const { newName } = req.body;  // Change to match frontend "newName"

    // Decode folderPath to handle URL encoding
    const decodedFolderPath = decodeURIComponent(folderPath);

    // Find the room
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).send('Room not found');
    }

    // Find the folder by its path
    const targetFolder = room.folders.find(folder => folder.path === decodedFolderPath);
    if (!targetFolder) {
      return res.status(404).send('Folder not found');
    }

    // Find the file within the folder by its name
    const fileToRename = targetFolder.files.find(file => file.fileName === fileName);
    if (!fileToRename) {
      return res.status(404).send('File not found');
    }

    // Rename the file
    fileToRename.fileName = newName;

    // Save the updated room document
    await room.save();

    res.send('File renamed successfully');
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).send('Server error');
  }
});

// Add this new route for room access verification
router.get('/:roomId/verify-access', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    console.log(`Verifying access for user ${userId} to room ${roomId}`);

    // Find the room by roomId
    const room = await Room.findOne({ roomId })
      .populate({
        path: 'users',
        select: 'name avatar'
      });

    if (!room) {
      console.log(`Room ${roomId} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
    }

    // Check if user is the owner or a member
    const isOwner = room.userId.toString() === userId.toString();
    const isMember = room.users.some(user => user._id.toString() === userId.toString());

    if (!isOwner && !isMember) {
      console.log(`User ${userId} is not authorized to access room ${roomId}`);
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to access this room',
        code: 'ACCESS_DENIED'
      });
    }

    console.log(`Access granted for user ${userId} to room ${roomId}`);
    res.status(200).json({ 
      success: true, 
      message: 'Access granted',
      room: {
        roomId: room.roomId,
        roomName: room.roomName,
        isOwner,
        isMember: true
      }
    });

  } catch (error) {
    console.error('Error verifying room access:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while verifying access',
      code: 'SERVER_ERROR'
    });
  }
});

// Owner-only routes - add additional owner check
const verifyRoomOwner = (req, res, next) => {
  if (!req.isOwner) {
    return res.status(403).json({ 
      success: false,
      message: 'Only room owners can perform this action',
      code: 'OWNER_REQUIRED'
    });
  }
  next();
};

router.delete('/:roomId/remove-user/:removeId', verifyToken, verifyRoomAccess, verifyRoomOwner, async (req, res) => {
  try {
    const { roomId, removeId } = req.params;
    console.log(roomId);
    console.log(removeId);
    // Ensure `userId` is a valid ObjectId
    // if (!mongoose.Types.ObjectId.isValid(removeId)) {
    //   return res.status(400).json({ message: 'Invalid user ID format.' });
    // }
    const room = await Room.findOne({roomId});
    
    console.log("hello");
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    // Check if the user making the request is the owner
    if (req.user.userId !== room.userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }
    console.log("here");
    // Remove the user from the room's users array
    room.users = room.users.filter(user => user.toString() !== removeId); // Convert ObjectId to string for comparison
    console.log("noew here");
    await room.save();

    res.json({ message: 'User removed successfully.' });
  } catch (error) {
    console.error('Error removing user from room:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/:roomId/change-owner/:newOwnerId', verifyToken, verifyRoomAccess, verifyRoomOwner, async (req, res) => {
  try {
    const { roomId, newOwnerId } = req.params;
    console.log(newOwnerId)
    // Ensure `userId` is a valid ObjectId
    // if (!mongoose.Types.ObjectId.isValid(removeId)) {
    //   return res.status(400).json({ message: 'Invalid user ID format.' });
    // }
    const room = await Room.findOne({roomId});
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    // Check if the user making the request is the owner
    if (req.user.userId !== room.userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to change the owner ' });
    }
   
    // Remove the user from the room's users array
    room.userId=newOwnerId; // Convert ObjectId to string for comparison

    await room.save();

    res.json({ message: 'User removed successfully.' });
  } catch (error) {
    console.error('Error removing user from room:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
router.delete('/delete/:roomId', verifyToken, verifyRoomAccess, verifyRoomOwner, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if the current user is the owner of the room
    if (room.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this room' });
    }

    await Room.deleteOne({ roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete room', error: err.message });
  }
}); 

module.exports = router;
