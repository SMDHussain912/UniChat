const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

exports.searchMessages = async (req, res) => {
  try {
    const { q, conversationId, senderId, dateFrom, dateTo, limit = 50 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const query = { deleted: false };

    if (conversationId) {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p._id.toString() === userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      query.conversationId = conversationId;
    }

    if (senderId) {
      query.senderId = senderId;
    }

    if (q) {
      query.text = { $regex: q, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('senderId', 'name displayName avatar')
      .lean();

    res.status(200).json({ success: true, messages, total: messages.length });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.searchConversations = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const conversations = await Conversation.find({
      participants: userId,
      $or: [
        { 'participants.name': { $regex: q, $options: 'i' } }
      ]
    })
      .limit(parseInt(limit, 10))
      .lean();

    res.status(200).json({ success: true, conversations, total: conversations.length });
  } catch (error) {
    console.error('Error searching conversations:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMessagesByDateRange = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { dateFrom, dateTo, limit = 50 } = req.query;
    const userId = req.user?.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = {
      conversationId,
      deleted: false
    };

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('senderId', 'name displayName avatar')
      .lean();

    res.status(200).json({ success: true, messages, total: messages.length });
  } catch (error) {
    console.error('Error getting messages by date:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};