const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9121/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9121';

export async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`;
  const defaultHeaders = await getAuthHeaders();

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const authService = {
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getToken: () => localStorage.getItem('token'),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
  }
};

export const chatService = {
  getOrCreateChat: (participantId) => apiRequest('/chat', {
    method: 'POST',
    body: JSON.stringify({ participantId })
  }),
  getChats: () => apiRequest('/chat', { method: 'GET' }),
  getMessages: (conversationId, cursor, limit) => {
    let url = `/chat/${conversationId}/messages`;
    const params = new URLSearchParams();
    if (cursor) params.set('before', cursor);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return apiRequest(url, { method: 'GET' });
  },
  sendMessage: (conversationId, text) => apiRequest(`/chat/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  }),
  editMessage: (conversationId, messageId, text) => apiRequest(`/chat/${conversationId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ text })
  }),
  deleteMessage: (conversationId, messageId) => apiRequest(`/chat/${conversationId}/messages/${messageId}`, {
    method: 'DELETE'
  })
};

export const serverService = {
  getServers: () => apiRequest('/servers', { method: 'GET' }),
  createServer: (name, description) => apiRequest('/servers', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  }),
  joinServer: (inviteCode) => apiRequest('/servers/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode })
  }),
  getChannels: (serverId) => apiRequest(`/servers/${serverId}/channels`, { method: 'GET' }),
  createChannel: (serverId, name, type, description) => apiRequest(`/servers/${serverId}/channels`, {
    method: 'POST',
    body: JSON.stringify({ name, type, description })
  }),
  deleteChannel: (serverId, channelId) => apiRequest(`/servers/${serverId}/channels/${channelId}`, {
    method: 'DELETE'
  }),
  updateChannel: (serverId, channelId, name, description) => apiRequest(`/servers/${serverId}/channels/${channelId}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description })
  }),
  sendChannelMessage: (serverId, channelId, text) => apiRequest(`/servers/${serverId}/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  })
};

export const userService = {
  searchUsers: (query) => apiRequest(`/users/search?query=${encodeURIComponent(query)}`, { method: 'GET' }),
  getUserProfile: (userId) => apiRequest(`/users/${userId}`, { method: 'GET' }),
  getFriendRequests: () => apiRequest('/users/friend-requests', { method: 'GET' }),
 respondToFriendRequest: (requestId, accept) => apiRequest('/users/friend-requests/respond', {
    method: 'POST',
    body: JSON.stringify({ requestId, accept })
  }),
  getCurrentUserProfile: () => apiRequest('/profile', { method: 'GET' })
};

export const notificationService = {
  getNotifications: () => apiRequest('/notifications', { method: 'GET' }),
  markAsRead: (notificationId) => apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PUT'
  })
};

export const callService = {
  initiateCall: (receiverId, callType) => apiRequest('/calls', {
    method: 'POST',
    body: JSON.stringify({ receiverId, callType })
  }),
  acceptCall: (callId) => apiRequest(`/calls/${callId}/accept`, {
    method: 'POST'
  }),
  rejectCall: (callId) => apiRequest(`/calls/${callId}/reject`, {
    method: 'POST'
  }),
  endCall: (callId) => apiRequest(`/calls/${callId}/end`, {
    method: 'POST'
  }),
  getCallHistory: (limit = 50) => apiRequest(`/calls/history?limit=${limit}`, {
    method: 'GET'
  })
};

export const mediaService = {
  uploadFile: (file, fileType = 'file') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    return apiRequest('/attachments/upload', {
      method: 'POST',
      body: formData
    });
  },
  uploadMultiple: (files, fileType = 'file') => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('fileType', fileType);
    return apiRequest('/attachments/upload/multiple', {
      method: 'POST',
      body: formData
    });
  },
  getAttachmentUrl: (fileName) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9121/api';
    return `${API_URL}/attachments/${fileName}/download`;
  },
  getAttachmentInfo: (attachmentId) => apiRequest(`/attachments/${attachmentId}`, {
    method: 'GET'
  }),
  deleteAttachment: (attachmentId) => apiRequest(`/attachments/${attachmentId}`, {
    method: 'DELETE'
  }),
  getAttachments: (messageId) => apiRequest(`/attachments/message/${messageId}`, {
    method: 'GET'
  })
};

export const reactionService = {
  getReactions: (messageId) => apiRequest(`/messages/${messageId}/reactions`, { method: 'GET' }),
  addReaction: (messageId, emoji) => apiRequest(`/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji })
  }),
  removeReaction: (messageId, emoji) => apiRequest(`/messages/${messageId}/reactions`, {
    method: 'DELETE',
    body: JSON.stringify({ emoji })
  }),
  toggleReaction: (messageId, emoji) => apiRequest(`/messages/${messageId}/reactions`, {
    method: 'PATCH',
    body: JSON.stringify({ emoji })
  })
};

export const stickerService = {
  getStickers: () => apiRequest('/stickers', { method: 'GET' }),
  getCustomStickers: (serverId) => apiRequest(`/servers/${serverId}/stickers`, { method: 'GET' }),
  createSticker: (serverId, data) => apiRequest(`/servers/${serverId}/stickers`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteSticker: (stickerId) => apiRequest(`/stickers/${stickerId}`, {
    method: 'DELETE'
  })
};

export const roleService = {
  getServerRoles: (serverId) => apiRequest(`/servers/${serverId}/roles`, { method: 'GET' }),
  createRole: (serverId, name, permissions) => apiRequest(`/servers/${serverId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ name, permissions })
  }),
  updateRole: (roleId, updates) => apiRequest(`/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  deleteRole: (roleId) => apiRequest(`/roles/${roleId}`, {
    method: 'DELETE'
  })
};

export const inviteService = {
  getServerInvites: (serverId) => apiRequest(`/servers/${serverId}/invites`, { method: 'GET' }),
  createInvite: (serverId, data) => apiRequest(`/servers/${serverId}/invites`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  validateInvite: (code) => apiRequest(`/invites/${code}`, { method: 'GET' }),
  acceptInvite: (code) => apiRequest(`/invites/${code}/accept`, {
    method: 'POST'
  }),
  revokeInvite: (inviteId) => apiRequest(`/invites/${inviteId}/revoke`, {
    method: 'POST'
  }),
  deleteExpiredInvites: (serverId) => apiRequest(`/servers/${serverId}/invites/expired`, {
    method: 'DELETE'
  })
};

export const moderationService = {
  kickMember: (serverId, memberId, reason) => apiRequest(`/servers/${serverId}/kick/${memberId}`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  banMember: (serverId, memberId, reason, duration) => apiRequest(`/servers/${serverId}/ban/${memberId}`, {
    method: 'POST',
    body: JSON.stringify({ reason, duration })
  }),
  unbanMember: (serverId, memberId) => apiRequest(`/servers/${serverId}/unban/${memberId}`, {
    method: 'POST'
  }),
  timeoutMember: (serverId, memberId, duration, reason) => apiRequest(`/servers/${serverId}/timeout/${memberId}`, {
    method: 'POST',
    body: JSON.stringify({ duration, reason })
  }),
  warnMember: (serverId, memberId, reason) => apiRequest(`/servers/${serverId}/warn/${memberId}`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  })
};

export const auditLogService = {
  getAuditLogs: (serverId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/servers/${serverId}/audit-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  getAuditLogStats: (serverId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/servers/${serverId}/audit-logs/stats${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }
};

export const memberService = {
  getServerMembers: (serverId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/servers/${serverId}/members${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  getServerMember: (serverId, memberId) => apiRequest(`/servers/${serverId}/members/${memberId}`, { method: 'GET' }),
  updateMemberNickname: (serverId, memberId, nickname) => apiRequest(`/servers/${serverId}/members/${memberId}/nickname`, {
    method: 'PUT',
    body: JSON.stringify({ nickname })
  }),
  updateMemberRoles: (serverId, memberId, roleIds) => apiRequest(`/servers/${serverId}/members/${memberId}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds })
  }),
  searchMembers: (serverId, query) => apiRequest(`/servers/${serverId}/members/search?query=${encodeURIComponent(query)}`, { method: 'GET' })
};