const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['permanent', 'temporary', 'one_time', 'expiring'],
    default: 'permanent'
  },
  maxUses: {
    type: Number,
    default: 0,
    min: 0
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0
  },
  expiresAt: {
    type: Date,
    default: null
  },
  maxAge: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

inviteSchema.index({ server: 1 });
inviteSchema.index({ code: 1 }, { unique: true });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

inviteSchema.methods.isExpired = function() {
  if (this.type === 'one_time' && this.currentUses >= 1) return true;
  if (this.maxUses > 0 && this.currentUses >= this.maxUses) return true;
  if (this.expiresAt && new Date() > this.expiresAt) return true;
  return false;
};

inviteSchema.methods.checkValidity = function() {
  const errors = [];
  if (this.type === 'one_time' && this.currentUses >= 1) {
    errors.push('Invite has already been used');
  }
  if (this.maxUses > 0 && this.currentUses >= this.maxUses) {
    errors.push('Invite has reached maximum uses');
  }
  if (this.expiresAt && new Date() > this.expiresAt) {
    errors.push('Invite has expired');
  }
  return errors;
};

module.exports = mongoose.model('Invite', inviteSchema);