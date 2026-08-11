const Invite = require('../models/Invite');
const Server = require('../models/Server');
const User = require('../models/User');
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

exports.createInvite = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { channelId, type, maxUses, maxAge, expiresAt } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (expiresAt) {
      expiresAt = new Date(expiresAt);
    }

    const invite = await Invite.create({
      server: serverId,
      channel: channelId || null,
      creator: userId,
      type: type || 'permanent',
      maxUses: maxUses || 0,
      currentUses: 0,
      expiresAt: expiresAt || null,
      maxAge: maxAge || 0,
      active: true,
      code: generateInviteCode()
    });

    await createAuditLog(serverId, userId, 'INVITE_CREATE', null, {
      inviteCode: invite.code,
      type: invite.type,
      maxUses: invite.maxUses,
      maxAge: invite.maxAge,
      expiresAt: invite.expiresAt
    });

    res.status(201).json({ success: true, invite });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getServerInvites = async (req, res) => {
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

    const invites = await Invite.find({ server: serverId, active: true })
      .populate('creator', 'name displayName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invites });
  } catch (error) {
    console.error('Error getting invites:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.validateInvite = async (req, res) => {
  try {
    const { code } = req.params;

    const invite = await Invite.findOne({ code, active: true })
      .populate('server', 'name icon description')
      .populate('channel', 'name');

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found or inactive' });
    }

    const validationErrors = invite.checkValidity();
    if (validationErrors.length > 0) {
      invite.active = false;
      await invite.save();
      return res.status(400).json({
        success: false,
        message: 'Invite is no longer valid',
        errors: validationErrors
      });
    }

    res.status(200).json({ success: true, invite });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user?.id;

    const invite = await Invite.findOne({ code, active: true });

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found or inactive' });
    }

    const validationErrors = invite.checkValidity();
    if (validationErrors.length > 0) {
      invite.active = false;
      await invite.save();
      return res.status(400).json({
        success: false,
        message: 'Invite is no longer valid',
        errors: validationErrors
      });
    }

    const server = await Server.findById(invite.server);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === userId);
    if (isMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this server' });
    }

    server.members.push({
      user: userId,
      role: 'member',
      joinedAt: Date.now()
    });

    invite.currentUses += 1;
    if (invite.type === 'one_time' || (invite.maxUses > 0 && invite.currentUses >= invite.maxUses)) {
      invite.active = false;
    }

    await server.save();
    await invite.save();

    await createAuditLog(invite.server, userId, 'MEMBER_JOIN', userId, {
      inviteCode: invite.code,
      inviteType: invite.type
    });

    res.status(200).json({ success: true, server });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.revokeInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.id;

    const invite = await Invite.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    const server = await Server.findById(invite.server);
    if (!checkServerPermission(userId, server, 'MANAGE_SERVER')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    invite.active = false;
    await invite.save();

    await createAuditLog(invite.server, userId, 'INVITE_REVOKE', null, {
      inviteCode: invite.code,
      inviteId: invite._id
    }, 'Invite revoked');

    res.status(200).json({ success: true, message: 'Invite revoked' });
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteExpiredInvites = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!checkServerPermission(userId, server, 'MANAGE_SERVER')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const result = await Invite.updateMany(
      { server: serverId, active: true, $or: [{ expiresAt: { $lt: new Date() } }, { maxUses: { $gt: 0 }, $expr: { $gte: ['$currentUses', '$maxUses'] } }] },
      { active: false }
    );

    res.status(200).json({ success: true, deletedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error deleting expired invites:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}