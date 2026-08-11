const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extension: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  duration: {
    type: Number,
    default: null
  },
  thumbnail: {
    type: String,
    default: null
  },
  storagePath: {
    type: String,
    required: true
  },
  storageProvider: {
    type: String,
    enum: ['local', 's3', 'r2', 'gcs', 'firebase'],
    default: 'local'
  },
  checksum: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

attachmentSchema.index({ uploader: 1 });
attachmentSchema.index({ message: 1 });
attachmentSchema.index({ mimeType: 1 });
attachmentSchema.index({ extension: 1 });
attachmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Attachment', attachmentSchema);