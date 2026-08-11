const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Attachment = require('../models/Attachment');
const User = require('../models/User');

async function canAccessMessage(userId, messageId) {
  const message = await Message.findById(messageId).populate('conversationId');
  if (!message) return false;

  const conversation = message.conversationId;
  if (conversation.type === 'dm') {
    return conversation.participants.some(p => p.toString() === userId);
  }

  if (conversation.type === 'channel' && conversation.server) {
    const Server = require('../models/Server');
    const server = await Server.findById(conversation.server);
    if (!server) return false;
    return server.members.some(m => m.user.toString() === userId);
  }

  return conversation.participants.some(p => p.toString() === userId);
}

exports.getReactions = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!(await canAccessMessage(userId, messageId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.findById(messageId).select('reactions');

    const grouped = {};
    message.reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.userId);
    });

    const reactionList = Object.values(grouped).map(g => ({
      emoji: g.emoji,
      count: g.count,
      userIds: g.users,
      hasReacted: g.users.some(uid => uid.toString() === userId)
    }));

    res.status(200).json({ success: true, reactions: reactionList });
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id;

    if (!emoji || emoji.length > 2) {
      return res.status(400).json({ success: false, message: 'Invalid emoji' });
    }

    if (!(await canAccessMessage(userId, messageId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.findById(messageId);

    const existingIndex = message.reactions.findIndex(
      r => r.emoji === emoji && r.userId.toString() === userId
    );

    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
      await message.save();
      return res.status(200).json({ success: true, reaction: null, removed: true });
    }

    message.reactions.push({ userId, emoji });
    await message.save();

    const user = await User.findById(userId).select('name displayName');

    res.status(201).json({
      success: true,
      reaction: { emoji, userId, user: { id: user._id, name: user.name, displayName: user.displayName } }
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id;

    if (!(await canAccessMessage(userId, messageId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.findById(messageId);

    const initialLength = message.reactions.length;
    message.reactions = message.reactions.filter(
      r => !(r.emoji === emoji && r.userId.toString() === userId)
    );

    if (message.reactions.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Reaction not found' });
    }

    await message.save();

    res.status(200).json({ success: true, message: 'Reaction removed' });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id;

    if (!emoji || emoji.length > 2) {
      return res.status(400).json({ success: false, message: 'Invalid emoji' });
    }

    if (!(await canAccessMessage(userId, messageId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.findById(messageId);

    const existingIndex = message.reactions.findIndex(
      r => r.emoji === emoji && r.userId.toString() === userId
    );

    let result;
    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
      result = { action: 'removed', reaction: null };
    } else {
      message.reactions.push({ userId, emoji });
      result = { action: 'added' };
    }

    await message.save();

    const grouped = {};
    message.reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.userId);
    });

    const reactionList = Object.values(grouped).map(g => ({
      emoji: g.emoji,
      count: g.count,
      userIds: g.users,
      hasReacted: g.users.some(uid => uid.toString() === userId)
    }));

    res.status(200).json({ success: true, ...result, reactions: reactionList });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};