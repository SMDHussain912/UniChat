const express = require('express');
const router = express.Router();
const serverMemberController = require('../controllers/serverMember');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/servers/:serverId/members', serverMemberController.getServerMembers);
router.get('/servers/:serverId/members/:memberId', serverMemberController.getServerMember);
router.put('/servers/:serverId/members/:memberId/nickname', serverMemberController.updateMemberNickname);
router.put('/servers/:serverId/members/:memberId/roles', serverMemberController.updateMemberRoles);
router.get('/servers/:serverId/members/search', serverMemberController.searchMembers);

module.exports = router;