const express = require('express');
const router = express.Router();
const callController = require('../controllers/call');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/', callController.initiateCall);
router.post('/:callId/accept', callController.acceptCall);
router.post('/:callId/reject', callController.rejectCall);
router.post('/:callId/end', callController.endCall);
router.get('/history', callController.getCallHistory);

module.exports = router;
