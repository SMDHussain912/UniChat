const Server = require('../models/Server');
const Channel = require('../models/Channel');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'server-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create a new server
exports.createServer = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Server name is required' });
    }

    const server = await Server.create({
      name: name.trim(),
      description: description?.trim() || '',
      owner: userId,
      members: [{
        user: userId,
        role: 'owner',
        joinedAt: Date.now()
      }]
    });

    // Create default #general channel
    await Channel.create({
      name: 'general',
      type: 'text',
      server: server._id,
      createdBy: userId,
      position: 0
    });

    const populatedServer = await Server.findById(server._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      server: populatedServer
    });
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all servers for a user
exports.getUserServers = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const servers = await Server.find({
      'members.user': userId
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      servers
    });
  } catch (error) {
    console.error('Error getting user servers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get server by ID
exports.getServerById = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Check if user is a member
    const isMember = server.members.some(member => member.user._id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      server
    });
  } catch (error) {
    console.error('Error getting server:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update server
exports.updateServer = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Check if user is owner or admin
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (name) server.name = name.trim();
    if (description !== undefined) server.description = description.trim();

    await server.save();

    const updatedServer = await Server.findById(serverId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      server: updatedServer
    });
  } catch (error) {
    console.error('Error updating server:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete server
exports.deleteServer = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Only owner can delete
    if (server.owner.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only server owner can delete the server' });
    }

    // Delete all channels
    await Channel.deleteMany({ server: serverId });

    // Delete server
    await Server.findByIdAndDelete(serverId);

    res.status(200).json({
      success: true,
      message: 'Server deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Join server by invite code
exports.joinServer = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user?.id;

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const server = await Server.findOne({ inviteCode });

    if (!server) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }

    // Check if already a member
    const isMember = server.members.some(member => member.user.toString() === userId);
    if (isMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this server' });
    }

    // Add user as member
    server.members.push({
      user: userId,
      role: 'member',
      joinedAt: Date.now()
    });

    await server.save();

    const updatedServer = await Server.findById(server._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      server: updatedServer
    });
  } catch (error) {
    console.error('Error joining server:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Leave server
exports.leaveServer = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Owner cannot leave
    if (server.owner.toString() === userId) {
      return res.status(400).json({ success: false, message: 'Server owner cannot leave. Transfer ownership or delete the server.' });
    }

    // Remove member
    server.members = server.members.filter(member => member.user.toString() !== userId);
    await server.save();

    res.status(200).json({
      success: true,
      message: 'Left server successfully'
    });
  } catch (error) {
    console.error('Error leaving server:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Kick member from server
exports.kickMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Check if requester is owner or admin
    const requesterMember = server.members.find(m => m.user.toString() === userId);
    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Cannot kick owner
    if (server.owner.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot kick server owner' });
    }

    // Remove member
    server.members = server.members.filter(member => member.user.toString() !== memberId);
    await server.save();

    res.status(200).json({
      success: true,
      message: 'Member kicked successfully'
    });
  } catch (error) {
    console.error('Error kicking member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Upload server icon
exports.uploadServerIcon = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Check if user is owner or admin
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete old icon if exists
    if (server.icon && fs.existsSync(server.icon)) {
      fs.unlinkSync(server.icon);
    }

    // Update server icon
    server.icon = req.file.path;
    await server.save();

    res.status(200).json({
      success: true,
      message: 'Server icon uploaded successfully',
      icon: req.file.path
    });
  } catch (error) {
    console.error('Error uploading server icon:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Upload server banner
exports.uploadServerBanner = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Check if user is owner or admin
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete old banner if exists
    if (server.banner && fs.existsSync(server.banner)) {
      fs.unlinkSync(server.banner);
    }

    // Update server banner
    server.banner = req.file.path;
    await server.save();

    res.status(200).json({
      success: true,
      message: 'Server banner uploaded successfully',
      banner: req.file.path
    });
  } catch (error) {
    console.error('Error uploading server banner:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
