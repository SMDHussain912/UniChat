const express = require('express');
const router = express.Router();
const stickerController = require('../controllers/sticker');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/stickers', stickerController.getStickers);
router.get('/servers/:serverId/stickers', stickerController.getCustomStickers);
router.post('/servers/:serverId/stickers', stickerController.createSticker);
router.delete('/stickers/:stickerId', stickerController.deleteSticker);

module.exports = router;
