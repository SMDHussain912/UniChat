const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/servers/:serverId/audit-logs', auditLogController.getAuditLogs);
router.get('/servers/:serverId/audit-logs/stats', auditLogController.getAuditLogStats);

module.exports = router;