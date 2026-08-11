const mongoose = require('mongoose');

const permissionOverrideSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetType: {
    type: String,
    enum: ['role', 'member'],
    required: true
  },
  deny: [{
    type: String,
    enum: [
      'VIEW_CHANNEL',
      'SEND_MESSAGES',
      'MANAGE_MESSAGES',
      'MANAGE_CHANNELS',
      'MANAGE_ROLES',
      'MANAGE_SERVER',
      'KICK_MEMBERS',
      'BAN_MEMBERS',
      'MUTE_MEMBERS',
      'DEAFEN_MEMBERS',
      'MOVE_MEMBERS',
      'CONNECT',
      'CREATE_INSTANT_INVITE',
      'MANAGE_NICKNAMES'
    ]
  }],
  allow: [{
    type: String,
    enum: [
      'VIEW_CHANNEL',
      'SEND_MESSAGES',
      'MANAGE_MESSAGES',
      'MANAGE_CHANNELS',
      'MANAGE_ROLES',
      'MANAGE_SERVER',
      'KICK_MEMBERS',
      'BAN_MEMBERS',
      'MUTE_MEMBERS',
      'DEAFEN_MEMBERS',
      'MOVE_MEMBERS',
      'CONNECT',
      'CREATE_INSTANT_INVITE',
      'MANAGE_NICKNAMES'
    ]
  }]
}, { _id: false });

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'category'],
    default: 'text'
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  position: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  topic: {
    type: String,
    maxlength: 1024,
    default: ''
  },
  nsfw: {
    type: Boolean,
    default: false
  },
  rateLimitPerUser: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissionOverrides: [permissionOverrideSchema],
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

channelSchema.index({ server: 1, position: 1 });
channelSchema.index({ server: 1, type: 1 });
channelSchema.index({ parent: 1 });

module.exports = mongoose.model('Channel', channelSchema);