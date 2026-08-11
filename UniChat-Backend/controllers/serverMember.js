const Server = require('../models/Server');
const ServerMember = require('../models/ServerMember');
const User = require('../models/User');
const Role = require('../models/Role');
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

exports.getServerMembers = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { page = 1, limit = 50, search = '', sortBy = 'joinedAt', sortOrder = 'desc' } = req.query;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const memberIds = server.members.map(m => m.user);

    let query = { _id: { $in: memberIds } };
    let sortObj = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (sortBy === 'name') {
      sortObj = { name: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'role') {
      sortObj = { 'members.role': sortOrder === 'asc' ? 1 : -1 };
    } else {
      sortObj = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit, 10));

    const memberMap = {};
    server.members.forEach(m => {
      memberMap[m.user.toString()] = m;
    });

    const serverMembers = await ServerMember.find({
      server: serverId,
      user: { $in: users.map(u => u._id) }
    });

    const smMap = {};
    serverMembers.forEach(sm => {
      smMap[sm.user.toString()] = sm;
    });

    const serverRoles = await Role.find({ server: serverId });
    const roleMap = {};
    serverRoles.forEach(r => { roleMap[r._id.toString()] = r; });

    const members = users.map(user => {
      const memberData = memberMap[user._id.toString()] || {};
      const sm = smMap[user._id.toString()];
      const memberRoles = sm ? sm.roles : [];
      const primaryRole = memberData.role || 'member';

      return {
        id: user._id,
        name: user.name,
        displayName: user.displayName,
        avatar: user.avatar,
        nickname: sm ? sm.nickname : null,
        role: primaryRole,
        memberRoles: memberRoles.map(r => ({
          id: r._id,
          name: r.name,
          color: r.color,
          position: r.position
        })),
        joinedAt: memberData.joinedAt,
        lastSeen: sm ? sm.lastSeen : null,
        isBanned: sm ? sm.isBanned : false,
        isTimedOut: sm ? sm.isTimedOut : false,
        isMuted: sm ? sm.isMuted : false,
        isOnline: false
      };
    });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      members,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Error getting server members:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getServerMember = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(memberId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const sm = await ServerMember.findOne({ server: serverId, user: memberId });
    const memberData = server.members.find(m => m.user.toString() === memberId);

    const serverRoles = await Role.find({ server: serverId });
    const memberRoles = sm ? await Role.find({ _id: { $in: sm.roles } }) : [];

    res.status(200).json({
      success: true,
      member: {
        id: user._id,
        name: user.name,
        displayName: user.displayName,
        avatar: user.avatar,
        nickname: sm ? sm.nickname : null,
        role: memberData ? memberData.role : 'member',
        memberRoles: memberRoles.map(r => ({
          id: r._id,
          name: r.name,
          color: r.color
        })),
        joinedAt: memberData ? memberData.joinedAt : null,
        lastSeen: sm ? sm.lastSeen : null,
        isBanned: sm ? sm.isBanned : false,
        isTimedOut: sm ? sm.isTimedOut : false,
        isMuted: sm ? sm.isMuted : false
      }
    });
  } catch (error) {
    console.error('Error getting server member:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateMemberNickname = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { nickname } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const canManageNicknames = checkServerPermission(userId, server, 'MANAGE_NICKNAMES');
    const isSelf = userId === memberId;

    if (!canManageNicknames && !isSelf) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    let sm = await ServerMember.findOne({ server: serverId, user: memberId });

    if (sm) {
      sm.nickname = nickname?.trim() || null;
      await sm.save();
    } else {
      sm = await ServerMember.create({
        user: memberId,
        server: serverId,
        nickname: nickname?.trim() || null
      });
    }

    await createAuditLog(serverId, userId, 'MEMBER_NICKNAME_CHANGE', memberId, {
      oldNickname: null,
      newNickname: nickname?.trim() || null
    });

    res.status(200).json({ success: true, member: { id: memberId, nickname: sm.nickname } });
  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateMemberRoles = async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { roleIds } = req.body;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (!checkServerPermission(userId, server, 'MANAGE_ROLES')) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    if (server.owner.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot modify server owner roles' });
    }

    const validRoles = await Role.find({
      _id: { $in: roleIds },
      server: serverId
    });

    const validRoleIds = validRoles.map(r => r._id);

    let sm = await ServerMember.findOne({ server: serverId, user: memberId });

    if (sm) {
      sm.roles = validRoleIds;
      await sm.save();
    } else {
      sm = await ServerMember.create({
        user: memberId,
        server: serverId,
        roles: validRoleIds
      });
    }

    await createAuditLog(serverId, userId, 'MEMBER_ROLE_ADD', memberId, {
      addedRoles: validRoleIds,
      previousRoles: sm.roles
    });

    res.status(200).json({ success: true, memberRoles: validRoleIds });
  } catch (error) {
    console.error('Error updating member roles:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.searchMembers = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { query } = req.query;
    const userId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const memberIds = server.members.map(m => m.user);

    const users = await User.find({
      _id: { $in: memberIds },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('-password').limit(20);

    res.status(200).json({ success: true, members: users });
  } catch (error) {
    console.error('Error searching members:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};