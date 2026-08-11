const AuditLog = require('../models/AuditLog');
const Server = require('../models/Server');

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

exports.getAuditLogs = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    const currentUserId = req.user?.id;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === currentUserId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { server: serverId };

    if (action) {
      query.action = action;
    }

    if (userId) {
      query.$or = [
        { moderator: userId },
        { target: userId },
        { targetUser: userId }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const logs = await AuditLog.find(query)
      .populate('moderator', 'name displayName avatar')
      .populate('target', 'name displayName avatar')
      .populate('targetUser', 'name displayName avatar')
      .populate('targetChannel', 'name')
      .populate('targetRole', 'name')
      .populate('targetInvite', 'code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAuditLogStats = async (req, res) => {
  try {
    const { serverId } = req.params;
    const currentUserId = req.user?.id;
    const { days = 30 } = req.query;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const isMember = server.members.some(m => m.user.toString() === currentUserId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000);

    const stats = await AuditLog.aggregate([
      {
        $match: {
          server: require('mongoose').Types.ObjectId(serverId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalCount = await AuditLog.countDocuments({
      server: serverId,
      createdAt: { $gte: startDate }
    });

    res.status(200).json({
      success: true,
      stats,
      totalCount,
      period: { days: parseInt(days, 10), startDate, endDate: new Date() }
    });
  } catch (error) {
    console.error('Error getting audit log stats:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};