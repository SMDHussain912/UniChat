const typingUsers = new Map();

const TYPING_TIMEOUT = 3000;
const TYPING_THROTTLE = 500;

function startTyping(io, conversationId, userId) {
  const key = `${conversationId}:${userId}`;
  const now = Date.now();

  const existing = typingUsers.get(key);
  if (existing && (now - existing.lastEmit) < TYPING_THROTTLE) {
    return;
  }

  typingUsers.set(key, { lastEmit: now, timeout: null });

  const participants = getConversationParticipants(conversationId);
  if (!participants) return;

  io.to(conversationId).emit('typing', {
    conversationId,
    userId,
    timestamp: now
  });

  clearTimeout(existing?.timeout);
  typingUsers.get(key).timeout = setTimeout(() => {
    stopTyping(io, conversationId, userId);
  }, TYPING_TIMEOUT);
}

function stopTyping(io, conversationId, userId) {
  io.to(conversationId).emit('stop-typing', {
    conversationId,
    userId,
    timestamp: Date.now()
  });

  const key = `${conversationId}:${userId}`;
  const entry = typingUsers.get(key);
  if (entry) {
    clearTimeout(entry.timeout);
    typingUsers.delete(key);
  }
}

function stopAllTyping(io, conversationId, userId) {
  const key = `${conversationId}:${userId}`;
  const entry = typingUsers.get(key);
  if (entry) {
    clearTimeout(entry.timeout);
    typingUsers.delete(key);

    io.to(conversationId).emit('stop-typing', {
      conversationId,
      userId,
      timestamp: Date.now()
    });
  }
}

function getConversationParticipants(conversationId) {
  return null;
}

module.exports = {
  startTyping,
  stopTyping,
  stopAllTyping
};