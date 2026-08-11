const Role = require('../models/Role');
const Server = require('../models/Server');
const AuditLog = require('../models/AuditLog');

function checkServerPermission(user, server, permission) {
  const member = server.members.find(m => m.user.toString() === user);
  if (!member) return false;
  if (member.role === 'owner') return true;
  if (member.role === 'admin') return true;
  if (member.role === 'moderator') {
    const restrictedPerms = ['MANAGE_SERVER', 'MANAGE_ROLES', 'BAN_MEMBERS'];
    return !restrictedPerms.includes(permission);
  }
  return false;
}

async function createAuditLog(serverId, moderatorId, action, target, details, reason) {
  try {
    await AuditLog.create({
      server: serverId,
      action,
      moderator: moderatorId,
      target: target || null,
      details,
      reason: reason || ''
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

exports.createRole = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, color, hoist, position, permissions } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!checkServerPermission(userId, server, 'MANAGE_ROLES')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const defaultPermissions = permissions || [
      'VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT'
    ];

    const role = await Role.create({
      name: name.trim(),
      server: serverId,
      color: color || '#000000',
      hoist: hoist || false,
      position: position || 0,
      permissions: defaultPermissions.map(p => ({ name: p, granted: true }))
    });

    server.roles.push(role._id);
    await server.save();

    await createAuditLog(serverId, userId, 'ROLE_CREATE', null, {
      roleId: role._id,
      roleName: role.name
    });

    res.status(201).json({ success: true, role });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getServerRoles = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const roles = await Role.find({ server: serverId }).sort({ position: 1 });

    res.status(200).json({ success: true, roles });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, color, hoist, position, permissions } = req.body;
    const userId = req.user?.id;

    const role = await Role.findById(roleId).populate('server');
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const server = await Server.findById(role.server);
    if (!checkServerPermission(userId, server, 'MANAGE_ROLES')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (name !== undefined) role.name = name.trim();
    if (color !== undefined) role.color = color;
    if (hoist !== undefined) role.hoist = hoist;
    if (position !== undefined) role.position = position;
    if (permissions !== undefined) {
      role.permissions = permissions.map(p => ({
        name: p.name,
        granted: p.granted !== undefined ? p.granted : true
      }));
    }

    await role.save();

    await createAuditLog(server._id, userId, 'ROLE_UPDATE', null, {
      roleId: role._id,
      roleName: role.name,
      changes: { name, color, hoist, position, permissions }
    });

    res.status(200).json({ success: true, role });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const userId = req.user?.id;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const server = await Server.findById(role.server);
    if (!checkServerPermission(userId, server, 'MANAGE_ROLES')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const roleServerId = role.server;
    await Role.findByIdAndDelete(roleId);

    if (server) {
      server.roles = server.roles.filter(r => r.toString() !== roleId);
      await server.save();
    }

    await createAuditLog(roleServerId, userId, 'ROLE_DELETE', null, {
      roleId: role._id,
      roleName: role.name
    });

    res.status(200).json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.hasPermission = async (req, res) => {
  try {
    const { serverId, permission } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const member = server.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(403).json({ success: false, message: 'Not a member' });
    }

    const hasAccess = checkServerPermission(userId, server, permission);

    res.status(200).json({ success: true, hasPermission: hasAccess });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};