const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  icon: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member', 'guest'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  defaultRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  inviteCode: {
    type: String,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 15)
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  verificationLevel: {
    type: String,
    enum: ['none', 'low', 'medium', 'high', 'very_high'],
    default: 'none'
  },
  afkChannel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  afkTimeout: {
    type: Number,
    default: 300
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  discoveryEnabled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

serverSchema.index({ owner: 1 });
serverSchema.index({ 'members.user': 1 });
serverSchema.index({ roles: 1 });

module.exports = mongoose.model('Server', serverSchema);