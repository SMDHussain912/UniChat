const mongoose = require('mongoose');

const callParticipantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  isVideoOff: {
    type: Boolean,
    default: false
  }
}, {
  _id: false
});

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'ended', 'rejected', 'busy', 'missed', 'failed'],
    default: 'initiated'
  },
  participants: [callParticipantSchema],
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  iceCandidates: [{
    candidate: String,
    sdpMLineIndex: Number,
    sdpMid: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ 'participants.user': 1 });

callSchema.pre('save', function() {
  if (this.status === 'ended' && this.startTime && !this.endTime) {
    this.endTime = new Date();
  }
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
});

callSchema.virtual('isActive').get(function() {
  return this.status === 'connected';
});

module.exports = mongoose.model('Call', callSchema);