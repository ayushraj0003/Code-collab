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
router.get('/:roomId/users', verifyToken, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('userId')  
      .populate('users'); 
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(room); // Send the room with populated userId and users
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/save-code', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Save the current version of the code
    room.codeHistory.push({ code, date: new Date() });
    await room.save();

    res.status(200).json({ message: 'Code saved successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:roomId/commit', verifyToken, async (req, res) => {
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

router.post('/:roomId/upload-file', verifyToken, upload.single('file'), async (req, res) => {
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

router.get('/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find the room by its roomId
    const room = await Room.findOne({ roomId })
    .populate({
      path: 'users',  // Populate users field
      select: 'name avatar', // Select both name and avatar fields
    })
      .populate('folders.files.owner', 'name');// Populate file owners' names

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Respond with room data including folders and files
    res.status(200).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:roomId/file/:filename', verifyToken, async (req, res) => {
  try {
    const { roomId, filename } = req.params;

    // Find the room by roomId and file by filename
    const room = await Room.findOne({ roomId, 'files.filename': filename })

    if (!room) {
      return res.status(404).json({ message: 'Room or file not found' });
    }

    const file = room.files.find(file => file.filename === filename);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const latestCode = file.codeHistory.length > 0 
      ? file.codeHistory[file.codeHistory.length - 1].code 
      : '';

    const auth = file.codeHistory.length > 0 
    ? file.codeHistory[file.codeHistory.length - 1].author 
    : '';

    res.status(200).json({ content: latestCode,  latestAuth: auth});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/:roomId/upload-folder', verifyToken, upload.array('files'), async (req, res) => {
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



router.get('/:roomId/folder-file', verifyToken, async (req, res) => {
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

router.post('/:roomId/commit-folder-file', verifyToken, async (req, res) => {
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
const extractRepoInfo = (repoUrl) => {
  // Regular expression to match and capture owner and repo names
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(regex);

  if (match && match.length === 3) {
    const owner = match[1];
    const repoName = match[2];
    return { owner, repoName };
  } else {
    throw new Error('Invalid GitHub URL');
  }
};
const getGitHubFiles = async (repoUrl) => {
  const { owner, repoName } = extractRepoInfo(repoUrl);
  console.log(repoUrl)
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents`;

  try {
    const response = await axios.get(apiUrl);
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch files from GitHub: ${err.message}`);
  }
};

router.post('/:roomId/github-upload', async (req, res) => {
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

router.delete('/delete/:roomId', verifyToken, async (req, res) => {
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
