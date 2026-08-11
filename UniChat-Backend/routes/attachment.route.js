const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachment');
const authMiddleware = require('../middlewares/auth');
const upload = require('../services/storage').upload;

router.use(authMiddleware);

router.post('/upload', upload.single('file'), attachmentController.uploadAttachment);
router.post('/upload/multiple', upload.array('files', 10), attachmentController.uploadMultiple);
router.get('/:attachmentId', attachmentController.getAttachmentInfo);
router.get('/:fileName/download', attachmentController.getAttachment);
router.delete('/:attachmentId', attachmentController.deleteAttachment);
router.get('/message/:messageId', attachmentController.getAttachments);
router.post('/upload-url', attachmentController.getUploadUrl);

module.exports = router;