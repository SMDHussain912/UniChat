const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/servers/:serverId/kick/:memberId', moderationController.kickMember);
router.post('/servers/:serverId/ban/:memberId', moderationController.banMember);
router.post('/servers/:serverId/unban/:memberId', moderationController.unbanMember);
router.post('/servers/:serverId/timeout/:memberId', moderationController.timeoutMember);
router.post('/servers/:serverId/warn/:memberId', moderationController.warnMember);

module.exports = router;