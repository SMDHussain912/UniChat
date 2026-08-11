const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
      'MANAGE_NICKNAMES',
      'MANAGE_WEBHOOKS',
      'USE_APPLICATION_COMMANDS',
      'PRIORITY_SPEAKER'
    ]
  },
  granted: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  color: {
    type: String,
    default: '#000000'
  },
  hoist: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    default: 0
  },
  permissions: [permissionSchema],
  managed: {
    type: Boolean,
    default: false
  },
  mentionable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

roleSchema.index({ server: 1, position: 1 });
roleSchema.index({ server: 1, name: 1 });

roleSchema.pre('save', function(next) {
  this.permissions = this.permissions.map(p => {
    if (p.granted === undefined) p.granted = true;
    return p;
  });
  next();
});

module.exports = mongoose.model('Role', roleSchema);