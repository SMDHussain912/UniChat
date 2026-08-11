const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/servers/:serverId/roles', roleController.createRole);
router.get('/servers/:serverId/roles', roleController.getServerRoles);
router.put('/roles/:roleId', roleController.updateRole);
router.delete('/roles/:roleId', roleController.deleteRole);
router.get('/servers/:serverId/permissions/:permission', roleController.hasPermission);

module.exports = router;