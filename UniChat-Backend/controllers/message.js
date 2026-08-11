const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const onlineUsers = require('../services/onlineUsers');

async function handleClientMessage(socket, data, io) {
  try {
    const { conversationId, text, replyTo, attachments } = data;
    const senderId = socket.user.id;

    if (!conversationId || !text || !text.trim()) {
      socket.emit('message-error', { error: 'Message text is required' });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      socket.emit('message-error', { error: 'Conversation not found' });
      return;
    }

    if (!conversation.participants.some(p => p._id.toString() === senderId)) {
      socket.emit('message-error', { error: 'Access denied' });
      return;
    }

    const message = await Message.create({
      conversationId,
      senderId,
      text: text.trim(),
      attachments: attachments || [],
      replyTo: replyTo || null,
      status: 'sent'
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

    const sender = await User.findById(senderId).select('name');

    const msgPayload = {
      id: message._id,
      conversationId,
      senderId,
      sender: sender.name,
      text: message.text,
      attachments: message.attachments || [],
      replyTo: message.replyTo,
      edited: message.edited,
      deleted: message.deleted,
      createdAt: message.createdAt,
      status: 'sent'
    };

    io.to(conversationId).emit('new-message', msgPayload);

    const participantIds = conversation.participants.map(p => p._id);
    const onlineReceiverIds = participantIds.filter(pid =>
      pid.toString() !== senderId && onlineUsers.isOnline(pid)
    );

    for (const rid of onlineReceiverIds) {
      message.deliveredTo.push(rid);
      await message.save();

      io.to(onlineUsers.getSocketIds(rid)[0]).emit('message-delivered', {
        messageId: message._id,
        conversationId,
        status: 'delivered',
        deliveredTo: [...message.deliveredTo]
      });
    }

    if (onlineReceiverIds.length === 0 && message.deliveredTo.length > 0) {
      await message.save();
    }

    socket.emit('message-sent', {
      id: message._id,
      conversationId,
      text: message.text,
      senderId,
      createdAt: message.createdAt,
      status: 'sent'
    });
  } catch (error) {
    console.error('Error handling client message:', error);
    socket.emit('message-error', { error: error.message });
  }
}

async function handleEditMessage(socket, data, io) {
  try {
    const { conversationId, messageId, text } = data;
    const senderId = socket.user.id;

    if (!text || !text.trim()) {
      socket.emit('message-error', { error: 'Message text is required' });
      return;
    }

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      socket.emit('message-error', { error: 'Message not found' });
      return;
    }

    if (message.senderId.toString() !== senderId) {
      socket.emit('message-error', { error: 'Can only edit your own messages' });
      return;
    }

    if (message.deleted) {
      socket.emit('message-error', { error: 'Cannot edit a deleted message' });
      return;
    }

    message.text = text.trim();
    message.edited = true;
    message.updatedAt = new Date();
    await message.save();

    const sender = await User.findById(senderId).select('name');

    io.to(conversationId).emit('message-edited', {
      messageId,
      conversationId,
      text: message.text,
      edited: true,
      updatedAt: message.updatedAt,
      sender: sender.name
    });
  } catch (error) {
    console.error('Error editing message:', error);
    socket.emit('message-error', { error: error.message });
  }
}

async function handleDeleteMessage(socket, data, io) {
  try {
    const { conversationId, messageId } = data;
    const senderId = socket.user.id;

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      socket.emit('message-error', { error: 'Message not found' });
      return;
    }

    if (message.senderId.toString() !== senderId) {
      socket.emit('message-error', { error: 'Can only delete your own messages' });
      return;
    }

    message.deleted = true;
    message.text = '';
    message.updatedAt = new Date();
    await message.save();

    io.to(conversationId).emit('message-deleted', {
      messageId,
      conversationId,
      deleted: true
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    socket.emit('message-error', { error: error.message });
  }
}

async function handleReadReceipt(socket, data, io) {
  try {
    const { conversationId, messageId } = data;
    const readerId = socket.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      socket.emit('message-error', { error: 'Message not found' });
      return;
    }

    if (!message.readBy.includes(readerId)) {
      message.readBy.push(readerId);
      await message.save();
    }

    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCounts.set(readerId.toString(), 0);
      await conversation.save();
    }

    const senderId = message.senderId;
    if (onlineUsers.isOnline(senderId)) {
      const senderSockets = onlineUsers.getSocketIds(senderId);
      for (const sid of senderSockets) {
        io.to(sid).emit('message-read', {
          messageId,
          conversationId,
          readerId,
          readAt: new Date()
        });
      }
    }

    socket.emit('message-read', {
      messageId,
      conversationId,
      readAt: new Date()
    });
  } catch (error) {
    console.error('Error handling read receipt:', error);
    socket.emit('message-error', { error: error.message });
  }
}

module.exports = {
  handleClientMessage,
  handleEditMessage,
  handleDeleteMessage,
  handleReadReceipt
};