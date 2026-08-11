const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true
});

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'VOICE', 'GIF', 'STICKER', 'SYSTEM'],
    default: 'TEXT'
  },
  text: {
    type: String,
    default: ''
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  sticker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sticker',
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  edited: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pinned: {
    type: Boolean,
    default: false
  },
  reactions: {
    type: [reactionSchema],
    default: []
  }
}, {
  timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, senderId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, readBy: 1 });
messageSchema.index({ 'reactions.emoji': 1 });
messageSchema.index({ type: 1 });

module.exports = mongoose.model('Message', messageSchema);