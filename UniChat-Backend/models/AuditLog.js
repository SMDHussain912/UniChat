const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'MEMBER_JOIN',
      'MEMBER_LEAVE',
      'MEMBER_KICK',
      'MEMBER_BAN',
      'MEMBER_UNBan',
      'MEMBER_TIMEOUT',
      'MEMBER_NICKNAME_CHANGE',
      'MEMBER_ROLE_ADD',
      'MEMBER_ROLE_REMOVE',
      'ROLE_CREATE',
      'ROLE_UPDATE',
      'ROLE_DELETE',
      'PERMISSION_UPDATE',
      'CHANNEL_CREATE',
      'CHANNEL_UPDATE',
      'CHANNEL_DELETE',
      'INVITE_CREATE',
      'INVITE_DELETE',
      'INVITE_REVOKE',
      'MESSAGE_DELETE',
      'MESSAGE_BULK_DELETE',
      'SERVER_UPDATE',
      'MODERATION_WARN',
      'MESSAGE_PIN',
      'MESSAGE_UNPIN',
      'VOICE_STATE_UPDATE',
      'SERVER_DISCOVERY_UPDATE'
    ]
  },
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  targetChannel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  targetRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  targetInvite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invite',
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reason: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

auditLogSchema.index({ server: 1, createdAt: -1 });
auditLogSchema.index({ server: 1, action: 1 });
auditLogSchema.index({ server: 1, moderator: 1 });
auditLogSchema.index({ server: 1, targetUser: 1 });
auditLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);