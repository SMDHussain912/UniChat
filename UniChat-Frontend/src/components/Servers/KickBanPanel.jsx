import { useState, useEffect } from 'react';

export function KickBanPanel({ serverId, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState('kick');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [ executing, setExecuting] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/members/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.members || []);
      }
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const handleAction = async () => {
    if (!selectedUser) return;
    setExecuting(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'kick'
        ? `/api/servers/${serverId}/kick/${selectedUser.id}`
        : `/api/servers/${serverId}/ban/${selectedUser.id}`;
      const body = action === 'ban'
        ? { reason, duration: duration ? parseInt(duration) : undefined }
        : { reason };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setExecuting(false);
        onClose();
      }
    } catch (error) {
      console.error(`Error ${action}ing member:`, error);
      setExecuting(false);
    }
  };

  return (
    <div className="kick-ban-panel">
      <div className="panel-header">
        <h3>{action === 'kick' ? 'Kick Member' : 'Ban Member'}</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search user to kick/ban..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map(user => (
            <div
              key={user.id}
              className={`search-result-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
              onClick={() => setSelectedUser(user)}
            >
              <span className="user-name">{user.displayName || user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="action-form">
          <p>Selected: <strong>{selectedUser.displayName || selectedUser.name}</strong></p>
          <div className="form-group">
            <label>Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Moderation reason"
            />
          </div>
          {action === 'ban' && (
            <div className="form-group">
              <label>Duration (seconds, optional)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Leave empty for permanent ban"
              />
            </div>
          )}
          <div className="form-actions">
            <button
              className="danger-btn"
              onClick={handleAction}
              disabled={executing}
            >
              {executing ? 'Processing...' : action === 'kick' ? 'Kick' : 'Ban'}
            </button>
          </div>
        </div>
      )}

      <div className="panel-tabs">
        <button
          className={action === 'kick' ? 'active' : ''}
          onClick={() => setAction('kick')}
        >
          Kick
        </button>
        <button
          className={action === 'ban' ? 'active' : ''}
          onClick={() => setAction('ban')}
        >
          Ban
        </button>
      </div>
    </div>
  );
}