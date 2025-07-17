const Room = require('../models/Room');

// Middleware to verify room access
const verifyRoomAccess = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    console.log(`Verifying room access for user ${userId} in room ${roomId}`);

    // Find the room
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ 
        success: false,
        message: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
    }

    // Check if user is owner or member
    const isOwner = room.userId.toString() === userId.toString();
    const isMember = room.users.some(user => user._id.toString() === userId.toString());

    if (!isOwner && !isMember) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to access this room',
        code: 'ACCESS_DENIED'
      });
    }

    // Attach room and access info to request
    req.room = room;
    req.isOwner = isOwner;
    req.isMember = true;
    
    next();
  } catch (error) {
    console.error('Error in room access verification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = { verifyRoomAccess };