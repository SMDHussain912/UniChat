const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');
const searchController = require('../controllers/search');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/', chatController.getOrCreateConversation);
router.get('/', chatController.getUserConversations);
router.get('/:conversationId/messages', chatController.getMessages);
router.post('/:conversationId/messages', chatController.createMessage);
router.put('/:conversationId/messages/:messageId', chatController.editMessage);
router.delete('/:conversationId/messages/:messageId', chatController.deleteMessage);

router.get('/search/messages', searchController.searchMessages);
router.get('/search/conversations', searchController.searchConversations);
router.get('/:conversationId/messages/date-range', searchController.getMessagesByDateRange);

module.exports = router;