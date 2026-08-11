const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const onlineUsers = require('./onlineUsers');

async function deliverMessage(messageId, io) {
  const message = await Message.findById(messageId).populate('conversationId');
  if (!message || message.deleted) return;

  const conversation = message.conversationId;
  if (!conversation) return;

  const senderId = message.senderId.toString();
  const participantIds = conversation.participants.map(p => p._id.toString());
  const receiverIds = participantIds.filter(id => id !== senderId);

  const onlineSockets = {};
  const offlineReceiverIds = [];

  for (const rid of receiverIds) {
    const sockets = onlineUsers.getSocketIds(rid);
    if (sockets.length > 0) {
      onlineSockets[rid] = sockets;
    } else {
      offlineReceiverIds.push(rid);
    }
  }

  const populated = await Message.findById(messageId)
    .populate('senderId', 'name displayName avatar');

  const msgPayload = {
    id: populated._id,
    conversationId,
    senderId: populated.senderId._id,
    sender: populated.senderId.name,
    text: populated.text,
    attachments: populated.attachments || [],
    replyTo: populated.replyTo,
    edited: populated.edited,
    deleted: populated.deleted,
    createdAt: populated.createdAt,
    status: 'delivered'
  };

  for (const sockets of Object.values(onlineSockets)) {
    for (const sid of sockets) {
      io.to(sid).emit('new-message', msgPayload);
    }
  }

  const allOnlineReceiverIds = Object.keys(onlineSockets);
  for (const rid of allOnlineReceiverIds) {
    populated.deliveredTo.push(rid);
  }

  await populated.save();

  if (offlineReceiverIds.length > 0) {
    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { deliveredTo: { $each: offlineReceiverIds } } }
    );
  }

  await updateConversationLastMessage(conversation._id, messageId);
}

async function markAsRead(messageId, readerId) {
  const message = await Message.findById(messageId);
  if (!message) return;

  if (!message.readBy.includes(readerId)) {
    message.readBy.push(readerId);
    await message.save();
  }

  const conversation = await Conversation.findById(message.conversationId);
  if (conversation) {
    conversation.unreadCounts.set(readerId.toString(), 0);
    await conversation.save();
  }
}

async function markConversationAsRead(conversationId, readerId) {
  const messages = await Message.find({
    conversationId,
    deleted: false,
    readBy: { $nin: [readerId] }
  });

  for (const msg of messages) {
    if (!msg.readBy.includes(readerId)) {
      msg.readBy.push(readerId);
      await msg.save();
    }
  }

  const conversation = await Conversation.findById(conversationId);
  if (conversation) {
    conversation.unreadCounts.set(readerId.toString(), 0);
    await conversation.save();
  }
}

async function updateConversationLastMessage(conversationId, messageId) {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: messageId,
    updatedAt: new Date()
  });
}

module.exports = {
  deliverMessage,
  markAsRead,
  markConversationAsRead,
  updateConversationLastMessage
};