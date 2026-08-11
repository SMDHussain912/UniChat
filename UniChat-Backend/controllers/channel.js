const Channel = require('../models/Channel');
const Server = require('../models/Server');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

let io = null;
exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

// Create a new channel
exports.createChannel = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, type, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const member = server.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const channels = await Channel.find({ server: serverId }).sort({ position: -1 });
    const nextPosition = channels.length > 0 ? channels[0].position + 1 : 0;

    const channel = await Channel.create({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type: type || 'text',
      description: description?.trim() || '',
      server: serverId,
      createdBy: userId,
      position: nextPosition
    });

    await Conversation.create({
      type: 'channel',
      channel: channel._id,
      server: serverId,
      participants: [userId]
    });

    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      channel: populatedChannel
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all channels for a server
exports.getServerChannels = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const channels = await Channel.find({ server: serverId })
      .populate('createdBy', 'name email')
      .sort({ position: 1 });

    res.status(200).json({
      success: true,
      channels
    });
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update channel
exports.updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const server = await Server.findById(channel.server);
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (name) channel.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) channel.description = description.trim();

    await channel.save();

    const updatedChannel = await Channel.findById(channelId)
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      channel: updatedChannel
    });
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete channel
exports.deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const server = await Server.findById(channel.server);
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Conversation.findOneAndDelete({ channel: channelId });
    await Channel.findByIdAndDelete(channelId);

    res.status(200).json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get channel messages (paginated)
exports.getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.id;
    const { before, limit = 50 } = req.query;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const server = await Server.findById(channel.server);
    const isMember = server.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const conversation = await Conversation.findOne({ channel: channelId });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        messages: [],
        hasMore: false,
        nextCursor: null
      });
    }

    const query = { conversationId: conversation._id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const senderIds = [...new Set(messages.map(msg => msg.senderId))];
    const users = await User.find({ _id: { $in: senderIds } }).select('name');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.name; });

    const formatted = messages.reverse().map(msg => ({
      id: msg._id,
      text: msg.text,
      sender: msg.deleted ? 'deleted' : (userMap[msg.senderId] || 'Unknown'),
      senderId: msg.senderId,
      timestamp: msg.createdAt
    }));

    const hasMore = messages.length === parseInt(limit, 10);
    const nextCursor = hasMore ? messages[messages.length - 1]?.createdAt : null;

    res.status(200).json({
      success: true,
      messages: formatted,
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.error('Error getting channel messages:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Send message to channel
exports.sendChannelMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const server = await Server.findById(channel.server);
    const isMember = server.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const conversation = await Conversation.findOne({ channel: channelId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const user = await User.findById(userId);

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: userId,
      text: text.trim()
    });

    conversation.lastMessage = message._id;
    conversation.updatedAt = message.createdAt;
    conversation.unreadCounts = conversation.unreadCounts || {};

    conversation.participants.forEach(participant => {
      const pid = participant._id.toString();
      if (pid !== userId) {
        const current = conversation.unreadCounts.get(pid) || 0;
        conversation.unreadCounts.set(pid, current + 1);
      }
    });

    await conversation.save();

    if (io) {
      // Emit to the specific channel room
      io.to(channelId).emit("channelMessage", {
        text: message.text,
        sender: user.name,
        senderId: message.senderId,
        timestamp: message.createdAt,
        channelId: channelId,
        conversationId: conversation._id,
        id: message._id
      });
    }

    res.status(200).json({
      success: true,
      message: {
        id: message._id,
        text: message.text,
        sender: user.name,
        senderId: message.senderId,
        timestamp: message.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending channel message:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};