const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reaction');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/messages/:messageId/reactions', reactionController.getReactions);
router.post('/messages/:messageId/reactions', reactionController.addReaction);
router.delete('/messages/:messageId/reactions', reactionController.removeReaction);
router.patch('/messages/:messageId/reactions', reactionController.toggleReaction);

module.exports = router;