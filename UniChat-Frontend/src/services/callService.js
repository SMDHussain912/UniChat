const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9121/api';

async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`;
  const config = {
    ...options,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
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