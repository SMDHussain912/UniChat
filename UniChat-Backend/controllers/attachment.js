const Attachment = require('../models/Attachment');
const storageService = require('../services/storage');
const User = require('../models/User');

async function validateUpload(req, res, next) {
  const { fileType = 'file' } = req.body;

  if (!req.file) {
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    } else {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
  }

  const fileTypeCategory = storageService.getFileType(req.file.mimetype);

  if (fileType === 'image' && fileTypeCategory !== 'image') {
    return res.status(400).json({ success: false, message: 'Invalid file type for image upload' });
  }

  if (fileType === 'voice' && fileTypeCategory !== 'voice') {
    return res.status(400).json({ success: false, message: 'Invalid file type for voice upload' });
  }

  if (!storageService.isSizeAllowed(req.file.mimetype, req.file.size)) {
    return res.status(413).json({ success: false, message: 'File too large' });
  }

  next();
}

exports.uploadAttachment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fileType = 'file' } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileTypeCategory = storageService.getFileType(req.file.mimetype);
    const sanitizedName = storageService.sanitizeFileName(req.file.originalname);
    const extension = storageService.getExtension(req.file.originalname);

    const attachment = await Attachment.create({
      uploader: userId,
      fileName: req.file.filename,
      originalName: sanitizedName,
      mimeType: req.file.mimetype,
      extension: extension,
      fileSize: req.file.size,
      storagePath: req.file.filename,
      storageProvider: storageService.StorageProvider.LOCAL,
      checksum: storageService.generateChecksum(req.file.buffer)
    });

    res.status(201).json({
      success: true,
      attachment: {
        id: attachment._id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        extension: attachment.extension,
        fileSize: attachment.fileSize,
        url: storageService.getFileUrl(attachment.fileName),
        thumbnail: attachment.thumbnail,
        createdAt: attachment.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};

exports.uploadMultiple = async (req, res) => {
  try {
    const userId = req.user?.id;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const attachments = [];

    for (const file of files) {
      const sanitizedName = storageService.sanitizeFileName(file.originalname);
      const extension = storageService.getExtension(file.originalname);

      const attachment = await Attachment.create({
        uploader: userId,
        fileName: file.filename,
        originalName: sanitizedName,
        mimeType: file.mimetype,
        extension: extension,
        fileSize: file.size,
        storagePath: file.filename,
        storageProvider: storageService.StorageProvider.LOCAL,
        checksum: storageService.generateChecksum(file.buffer)
      });

      attachments.push({
        id: attachment._id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        extension: attachment.extension,
        fileSize: attachment.fileSize,
        url: storageService.getFileUrl(attachment.fileName),
        thumbnail: attachment.thumbnail,
        createdAt: attachment.createdAt
      });
    }

    res.status(201).json({ success: true, attachments });
  } catch (error) {
    console.error('Error uploading multiple attachments:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};

exports.getAttachment = async (req, res) => {
  try {
    const { fileName } = req.params;

    const exists = await storageService.fileExists(fileName);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const attachment = await Attachment.findOne({ fileName });
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment record not found' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);

    const stream = await storageService.getFileStream(fileName);
    stream.pipe(res);
  } catch (error) {
    console.error('Error serving attachment:', error);
    res.status(500).json({ success: false, message: 'Failed to serve file' });
  }
};

exports.getAttachmentInfo = async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await Attachment.findById(attachmentId).populate('uploader', 'name displayName');

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    res.status(200).json({
      success: true,
      attachment: {
        id: attachment._id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        extension: attachment.extension,
        fileSize: attachment.fileSize,
        width: attachment.width,
        height: attachment.height,
        duration: attachment.duration,
        thumbnail: attachment.thumbnail,
        url: storageService.getFileUrl(attachment.fileName),
        uploader: attachment.uploader,
        createdAt: attachment.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting attachment info:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.user?.id;

    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    if (attachment.uploader.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not the uploader' });
    }

    await storageService.deleteFile(attachment.storagePath);
    await attachment.deleteOne();

    res.status(200).json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUploadUrl = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fileName, fileSize, mimeType } = req.body;

    if (!fileName || !fileSize || !mimeType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const sanitizedFileName = storageService.sanitizeFileName(fileName);
    const extension = storageService.getExtension(fileName);
    const storageFileName = storageService.generateFileName(fileName);

    res.status(200).json({
      success: true,
      uploadUrl: storageService.getFileUrl(storageFileName),
      fileName: storageFileName,
      originalName: sanitizedFileName,
      mimeType,
      extension,
      fileSize
    });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAttachments = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    const message = await require('../models/Message').findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const conversation = await require('../models/Conversation').findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const attachments = await Attachment.find({ message: messageId });

    res.status(200).json({
      success: true,
      attachments: attachments.map(a => ({
        id: a._id,
        fileName: a.fileName,
        originalName: a.originalName,
        mimeType: a.mimeType,
        extension: a.extension,
        fileSize: a.fileSize,
        url: storageService.getFileUrl(a.fileName),
        thumbnail: a.thumbnail,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting attachments:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};