const mongoose = require('mongoose');

const serverMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: 32,
    default: null
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: null
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  bannedUntil: {
    type: Date,
    default: null
  },
  isTimedOut: {
    type: Boolean,
    default: false
  },
  timedOutUntil: {
    type: Date,
    default: null
  },
  isMuted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

serverMemberSchema.index({ server: 1, user: 1 }, { unique: true });
serverMemberSchema.index({ server: 1 });
serverMemberSchema.index({ user: 1 });
serverMemberSchema.index({ server: 1, roles: 1 });

serverMemberSchema.methods.isActive = function() {
  if (this.isBanned) {
    if (this.bannedUntil && new Date() > this.bannedUntil) {
      return false;
    }
    return false;
  }
  if (this.isTimedOut && this.timedOutUntil && new Date() < this.timedOutUntil) {
    return false;
  }
  return true;
};

module.exports = mongoose.model('ServerMember', serverMemberSchema);