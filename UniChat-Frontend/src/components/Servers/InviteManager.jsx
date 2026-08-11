import { useState, useEffect } from 'react';

export function InviteManager({ serverId, onClose }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvite, setNewInvite] = useState({
    type: 'permanent',
    maxUses: 0,
    maxAge: 0,
    channelId: ''
  });
  const [createdInvite, setCreatedInvite] = useState(null);

  useEffect(() => {
    async function fetchInvites() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/servers/${serverId}/invites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setInvites(data.invites);
        }
      } catch (error) {
        console.error('Error fetching invites:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvites();
  }, [serverId]);

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newInvite)
      });
      if (res.ok) {
        const data = await res.json();
        setInvites([...invites, data.invite]);
        setCreatedInvite(data.invite);
        setNewInvite({ type: 'permanent', maxUses: 0, maxAge: 0, channelId: '' });
        setShowCreate(false);
      }
    } catch (error) {
      console.error('Error creating invite:', error);
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invites/${inviteId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInvites(invites.filter(inv => inv._id !== inviteId));
      }
    } catch (error) {
      console.error('Error revoking invite:', error);
    }
  };

  const handleDeleteExpired = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/invites/expired`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(invites.filter(inv => inv.active));
      }
    } catch (error) {
      console.error('Error deleting expired invites:', error);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`);
  };

  if (loading) return <div className="invite-manager loading">Loading invites...</div>;

  return (
    <div className="invite-manager">
      <div className="invite-manager-header">
        <h3>Invites</h3>
        <div className="invite-manager-actions">
          <button className="primary-btn" onClick={() => setShowCreate(true)}>
            Create Invite
          </button>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
      </div>

      {showCreate && (
        <div className="create-invite-form">
          <div className="form-group">
            <label>Invite Type</label>
            <select
              value={newInvite.type}
              onChange={(e) => setNewInvite(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="permanent">Permanent</option>
              <option value="temporary">Temporary</option>
              <option value="one_time">One-Time Use</option>
              <option value="expiring">Expiring</option>
            </select>
          </div>
          <div className="form-group">
            <label>Max Uses (0 = unlimited)</label>
            <input
              type="number"
              min="0"
              value={newInvite.maxUses}
              onChange={(e) => setNewInvite(prev => ({ ...prev, maxUses: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="form-group">
            <label>Max Age in seconds (0 = no expiry)</label>
            <input
              type="number"
              min="0"
              value={newInvite.maxAge}
              onChange={(e) => setNewInvite(prev => ({ ...prev, maxAge: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <button onClick={handleCreate}>Create Invite</button>
          <button onClick={() => { setShowCreate(false); setCreatedInvite(null); }}>Cancel</button>
        </div>
      )}

      {createdInvite && (
        <div className="created-invite-banner">
          <span>Invite created! Code: <strong>{createdInvite.code}</strong></span>
          <button onClick={() => copyToClipboard(createdInvite.code)}>Copy Link</button>
          <button onClick={() => setCreatedInvite(null)}>Dismiss</button>
        </div>
      )}

      <div className="invite-actions-bar">
        <button className="text-btn" onClick={handleDeleteExpired}>
          Delete Expired Invites
        </button>
      </div>

      <div className="invite-list">
        {invites.length === 0 ? (
          <div className="empty-state">No active invites</div>
        ) : (
          invites.map(invite => (
            <div key={invite._id} className="invite-item">
              <div className="invite-info">
                <code className="invite-code">{invite.code}</code>
                <span className="invite-type">{invite.type}</span>
                <span className="invite-uses">
                  {invite.currentUses}/{invite.maxUses || '∞'} uses
                </span>
                {invite.expiresAt && (
                  <span className="invite-expires">
                    Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                )}
                <span className={`invite-status ${invite.active ? 'active' : 'inactive'}`}>
                  {invite.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="invite-actions">
                <button
                  className="icon-btn"
                  onClick={() => copyToClipboard(invite.code)}
                >
                  Copy
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => handleRevoke(invite._id)}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}