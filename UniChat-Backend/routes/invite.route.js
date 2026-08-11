const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/invite');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/servers/:serverId/invites', inviteController.createInvite);
router.get('/servers/:serverId/invites', inviteController.getServerInvites);
router.get('/invites/:code', inviteController.validateInvite);
router.post('/invites/:code/accept', inviteController.acceptInvite);
router.post('/invites/:inviteId/revoke', inviteController.revokeInvite);
router.delete('/servers/:serverId/invites/expired', inviteController.deleteExpiredInvites);

module.exports = router;