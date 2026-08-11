const express = require('express');
const router = express.Router();
const serverController = require('../controllers/server');
const authMiddleware = require('../middlewares/auth');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/';
      if (!require('fs').existsSync(uploadDir)) {
        require('fs').mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'server-' + uniqueSuffix + require('path').extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(require('path').extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

// Server routes
router.post('/servers', serverController.createServer);
router.get('/servers', serverController.getUserServers);
router.get('/servers/:serverId', serverController.getServerById);
router.put('/servers/:serverId', serverController.updateServer);
router.delete('/servers/:serverId', serverController.deleteServer);
router.post('/servers/join', serverController.joinServer);
router.post('/servers/:serverId/leave', serverController.leaveServer);
router.post('/servers/:serverId/kick/:memberId', serverController.kickMember);

// File upload routes
router.post('/servers/:serverId/icon', upload.single('icon'), serverController.uploadServerIcon);
router.post('/servers/:serverId/banner', upload.single('banner'), serverController.uploadServerBanner);

module.exports = router;
