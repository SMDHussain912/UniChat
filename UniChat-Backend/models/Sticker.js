const mongoose = require('mongoose');

const stickerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
 server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['static', 'animated'],
    default: 'static'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isCustom: {
    type: Boolean,
    default: false
  },
  isAnimated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

stickerSchema.index({ server: 1 });
stickerSchema.index({ creator: 1 });
stickerSchema.index({ tags: 1 });

module.exports = mongoose.model('Sticker', stickerSchema);