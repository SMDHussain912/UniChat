const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['dm', 'channel'],
    default: 'dm'
  },
  // For DM chats - store user IDs instead of usernames
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // For channel chats
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null
  },
  messages: [{
    sender: {
      type: String,
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create indexes for efficient querying
chatSchema.index({ participants: 1, createdAt: -1 });
chatSchema.index({ channel: 1, createdAt: -1 });
chatSchema.index({ server: 1, createdAt: -1 });

// Virtual for participant names (usernames)
chatSchema.virtual('participantNames', {
  ref: 'User',
  localField: 'participants',
  foreignField: '_id',
  justOne: false
});

module.exports = mongoose.model('Chat', chatSchema);
