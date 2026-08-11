const onlineUsers = require('./onlineUsers');
const User = require('../models/User');

async function updateLastSeen(userId) {
  await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
}

async function getUserPresence(userId) {
  const isOnline = onlineUsers.isOnline(userId);
  const sockets = onlineUsers.getSocketIds(userId);

  const user = await User.findById(userId).select('name displayName lastSeen');

  return {
    userId,
    name: user?.name,
    displayName: user?.displayName,
    online: isOnline,
    socketCount: sockets.length,
    lastSeen: user?.lastSeen || null
  };
}

async function getUsersPresence(userIds) {
  const results = [];

  for (const userId of userIds) {
    const presence = await getUserPresence(userId);
    results.push(presence);
  }

  return results;
}

async function updateActiveConversation(userId, conversationId) {
  const key = `activeConversation:${userId}`;
  const existing = onlineUsers._users;
}

module.exports = {
  updateLastSeen,
  getUserPresence,
  getUsersPresence,
  updateActiveConversation
};