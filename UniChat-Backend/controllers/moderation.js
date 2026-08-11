const User = require('../models/User');
const Server = require('../models/Server');
const ServerMember = require('../models/ServerMember');
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

function hasBanPermission(user, server) {
  const member = server.members.find(m => m.user.toString() === user);
  if (!member) return false;
  return member.role === 'owner' || member.role === 'admin';
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

exports.kickMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!checkServerPermission(userId, server, 'KICK_MEMBERS')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (server.owner.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot kick server owner' });
    }

    if (server.owner.toString() === userId) {
      server.members = server.members.filter(m => m.user.toString() !== memberId);
    } else {
      const requesterMember = server.members.find(m => m.user.toString() === userId);
      if (requesterMember && requesterMember.role !== 'owner') {
        const targetMember = server.members.find(m => m.user.toString() === memberId);
        if (targetMember && targetMember.role === 'owner') {
          return res.status(403).json({ success: false, message: 'Cannot kick a server owner' });
        }
      }
      server.members = server.members.filter(m => m.user.toString() !== memberId);
    }

    await server.save();

    await createAuditLog(serverId, userId, 'MEMBER_KICK', memberId, {
      reason: reason || 'No reason provided'
    });

    res.status(200).json({ success: true, message: 'Member kicked successfully' });
  } catch (error) {
    console.error('Error kicking member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.banMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason, duration } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!hasBanPermission(userId, server)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (server.owner.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot ban server owner' });
    }

    const serverMember = await ServerMember.findOne({
      server: serverId,
      user: memberId
    });

    if (!serverMember) {
      const memberData = server.members.find(m => m.user.toString() === memberId);
      if (!memberData) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }
    }

    server.members = server.members.filter(m => m.user.toString() !== memberId);
    await server.save();

    if (serverMember) {
      await ServerMember.findByIdAndDelete(serverMember._id);
    }

    await createAuditLog(serverId, userId, 'MEMBER_BAN', memberId, {
      reason: reason || 'No reason provided',
      duration: duration || null
    });

    res.status(200).json({ success: true, message: 'Member banned successfully' });
  } catch (error) {
    console.error('Error banning member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.unbanMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!hasBanPermission(userId, server)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const serverMember = await ServerMember.findOne({
      server: serverId,
      user: memberId,
      isBanned: true
    });

    if (!serverMember) {
      return res.status(404).json({ success: false, message: 'Banned member not found' });
    }

    serverMember.isBanned = false;
    serverMember.bannedUntil = null;
    await serverMember.save();

    await createAuditLog(serverId, userId, 'MEMBER_UNBan', memberId, {
      reason: 'Ban lifted'
    });

    res.status(200).json({ success: true, message: 'Member unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.timeoutMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason, duration } = req.body;
    const userId = req.user?.id;

    if (!duration || !['60', '300', '900', '3600', '86400'].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeout duration. Must be one of: 60, 300, 900, 3600, 86400 seconds'
      });
    }

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!checkServerPermission(userId, server, 'MUTE_MEMBERS')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (server.owner.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot timeout server owner' });
    }

    const serverMember = await ServerMember.findOne({
      server: serverId,
      user: memberId
    });

    if (serverMember) {
      serverMember.isTimedOut = true;
      serverMember.timedOutUntil = new Date(Date.now() + parseInt(duration) * 1000);
      await serverMember.save();
    } else {
      const memberData = server.members.find(m => m.user.toString() === memberId);
      if (memberData) {
        await ServerMember.create({
          user: memberId,
          server: serverId,
          isTimedOut: true,
          timedOutUntil: new Date(Date.now() + parseInt(duration) * 1000)
        });
      }
    }

    await createAuditLog(serverId, userId, 'MEMBER_TIMEOUT', memberId, {
      reason: reason || 'Timeout applied',
      duration: parseInt(duration)
    });

    res.status(200).json({ success: true, message: 'Member timed out successfully' });
  } catch (error) {
    console.error('Error timing out member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.warnMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!checkServerPermission(userId, server, 'MANAGE_MESSAGES')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    await createAuditLog(serverId, userId, 'MODERATION_WARN', memberId, {
      reason: reason || 'Warning issued'
    });

    res.status(200).json({ success: true, message: 'Member warned successfully' });
  } catch (error) {
    console.error('Error warning member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};