const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Helper: build user-friendly message object for API responses
function formatMessage(msg, currentUserId) {
  return {
    id: msg._id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    text: msg.text,
    attachments: msg.attachments || [],
    replyTo: msg.replyTo,
    edited: msg.edited,
    deleted: msg.deleted,
    deliveredTo: msg.deliveredTo || [],
    readBy: msg.readBy || [],
    delivered: msg.deliveredTo.some(id => id.toString() === currentUserId?.toString()),
    read: msg.readBy.some(id => id.toString() === currentUserId?.toString()),
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt
  };
}

// Get or create conversation between two users
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId || !participantId) {
      return res.status(400).json({ success: false, message: 'User IDs are required' });
    }

    if (currentUserId.toString() === participantId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start a chat with yourself' });
    }

    let conversation = await Conversation.findOne({
      type: 'dm',
      participants: { $all: [currentUserId, participantId], $size: 2 }
    }).populate('participants', 'name displayName avatar bio');

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'dm',
        participants: [currentUserId, participantId]
      });
      await conversation.populate('participants', 'name displayName avatar bio');
    }

    res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all conversations for current user
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name displayName avatar bio')
      .populate('lastMessage', 'text senderId createdAt')
      .sort({ updatedAt: -1 });

    const result = conversations.map(conv => {
      const lastMsg = conv.lastMessage;
      return {
        ...conv.toObject(),
        lastMessage: lastMsg ? {
          id: lastMsg._id,
          text: lastMsg.text,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt
        } : null,
        unreadCount: (conv.unreadCounts && conv.unreadCounts.get(userId.toString())) || 0
      };
    });

    res.status(200).json({ success: true, conversations: result });
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get paginated messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;
    const { before, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const formatted = messages.reverse().map(msg => formatMessage(msg, userId));

    const hasMore = messages.length === parseInt(limit, 10);
    const nextCursor = hasMore ? messages[messages.length - 1]?.createdAt : null;

    res.status(200).json({ success: true, messages: formatted, hasMore, nextCursor });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create a message in a conversation
exports.createMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, attachments } = req.body;
    const senderId = req.user?.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p._id.toString() === senderId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.create({
      conversationId,
      senderId,
      text: text.trim(),
      attachments: attachments || []
    });

    conversation.lastMessage = message._id;
    conversation.updatedAt = message.createdAt;
    conversation.unreadCounts = conversation.unreadCounts || {};

    conversation.participants.forEach(participant => {
      const pid = participant._id.toString();
      if (pid !== senderId) {
        const current = conversation.unreadCounts.get(pid) || 0;
        conversation.unreadCounts.set(pid, current + 1);
      }
    });

    await conversation.save();

    res.status(201).json({ success: true, message: formatMessage(message, senderId) });
  } catch (error) {
    console.error('Error in createMessage:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Edit a message
exports.editMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { text } = req.body;
    const senderId = req.user?.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.senderId.toString() !== senderId) {
      return res.status(403).json({ success: false, message: 'Can only edit your own messages' });
    }

    if (message.deleted) {
      return res.status(400).json({ success: false, message: 'Cannot edit a deleted message' });
    }

    message.text = text.trim();
    message.edited = true;
    await message.save();

    res.status(200).json({ success: true, message: formatMessage(message, senderId) });
  } catch (error) {
    console.error('Error in editMessage:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Soft delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const senderId = req.user?.id;

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.senderId.toString() !== senderId) {
      return res.status(403).json({ success: false, message: 'Can only delete your own messages' });
    }

    message.deleted = true;
    message.text = '';
    await message.save();

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};