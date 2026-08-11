export function buildConversationName(conversation, currentUserId) {
  if (!conversation || !conversation.participants) return 'Unknown';
  const other = conversation.participants.find(p => p._id !== currentUserId);
  return other?.displayName || other?.name || 'Unknown';
}

export function getUnreadCount(conversation, currentUserId) {
  if (!conversation || !conversation.unreadCounts) return 0;
  return conversation.unreadCounts.get(currentUserId?.toString()) || 0;
}

export function hasUnreads(conversation, currentUserId) {
  return getUnreadCount(conversation, currentUserId) > 0;
}

export function isConversationOnline(conversation, onlineUserIds, currentUserId) {
  if (!conversation || !conversation.participants) return false;
  return conversation.participants.some(p =>
    p._id !== currentUserId && onlineUserIds.has(p._id.toString())
  );
}

export function sortConversations(conversations, currentUserId) {
  return [...conversations].sort((a, b) => {
    const aUnread = getUnreadCount(a, currentUserId);
    const bUnread = getUnreadCount(b, currentUserId);
    if (aUnread !== bUnread) return bUnread - aUnread;
    const aLast = a.lastMessage ? new Date(a.lastMessage.createdAt || a.updatedAt).getTime() : 0;
    const bLast = b.lastMessage ? new Date(b.lastMessage.createdAt || b.updatedAt).getTime() : 0;
    return bLast - aLast;
  });
}

export function sortMessages(messages) {
  return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function groupMessagesByDate(messages) {
  const groups = {};
  messages.forEach(msg => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  });
  return groups;
}

export function deepCompare(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}