const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channel');
const authMiddleware = require('../middlewares/auth');

// All routes require authentication
router.use(authMiddleware);

// Channel routes
router.post('/servers/:serverId/channels', channelController.createChannel);
router.get('/servers/:serverId/channels', channelController.getServerChannels);
router.put('/channels/:channelId', channelController.updateChannel);
router.delete('/channels/:channelId', channelController.deleteChannel);
router.get('/channels/:channelId/messages', channelController.getChannelMessages);
router.post('/channels/:channelId/messages', channelController.sendChannelMessage);

module.exports = router;