import { useState, useEffect } from 'react';

const ACTION_LABELS = {
  MEMBER_JOIN: 'Member Joined',
  MEMBER_LEAVE: 'Member Left',
  MEMBER_KICK: 'Member Kicked',
  MEMBER_BAN: 'Member Banned',
  MEMBER_UNBan: 'Member Unbanned',
  MEMBER_TIMEOUT: 'Member Timed Out',
  MEMBER_NICKNAME_CHANGE: 'Nickname Changed',
  MEMBER_ROLE_ADD: 'Role Added',
  MEMBER_ROLE_REMOVE: 'Role Removed',
  ROLE_CREATE: 'Role Created',
  ROLE_UPDATE: 'Role Updated',
  ROLE_DELETE: 'Role Deleted',
  PERMISSION_UPDATE: 'Permission Updated',
  CHANNEL_CREATE: 'Channel Created',
  CHANNEL_UPDATE: 'Channel Updated',
  CHANNEL_DELETE: 'Channel Deleted',
  INVITE_CREATE: 'Invite Created',
  INVITE_DELETE: 'Invite Deleted',
  INVITE_REVOKE: 'Invite Revoked',
  MESSAGE_DELETE: 'Message Deleted',
  MESSAGE_BULK_DELETE: 'Messages Bulk Deleted',
  SERVER_UPDATE: 'Server Updated',
  MODERATION_WARN: 'Member Warned',
  MESSAGE_PIN: 'Message Pinned',
  MESSAGE_UNPIN: 'Message Unpinned',
  VOICE_STATE_UPDATE: 'Voice State Updated',
  SERVER_DISCOVERY_UPDATE: 'Discovery Updated'
};

export function AuditLogPanel({ serverId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (filterAction) params.set('action', filterAction);
        if (filterUser) params.set('userId', filterUser);

        const [logsRes, statsRes] = await Promise.all([
          fetch(`/api/servers/${serverId}/audit-logs?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`/api/servers/${serverId}/audit-logs/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [serverId, filterAction, filterUser]);

  if (loading) return <div className="audit-log-panel loading">Loading audit logs...</div>;

  return (
    <div className="audit-log-panel">
      <div className="audit-log-header">
        <h3>Audit Logs</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      {stats && (
        <div className="audit-stats">
          <span>Total entries (30 days): {stats.totalCount}</span>
          <div className="stats-breakdown">
            {stats.stats.map(([action, count]) => (
              <span key={action} className="stat-badge">
                {ACTION_LABELS[action] || action}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="audit-filters">
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
        />
      </div>

      <div className="audit-log-list">
        {logs.length === 0 ? (
          <div className="empty-state">No audit log entries found</div>
        ) : (
          logs.map(log => (
            <div key={log._id} className="audit-log-entry">
              <div className="audit-log-action">
                <span className="action-badge">
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                {log.reason && <span className="audit-reason">{log.reason}</span>}
              </div>
              <div className="audit-log-details">
                <span className="audit-moderator">
                  by {log.moderator?.displayName || log.moderator?.name || 'Unknown'}
                </span>
                {log.targetUser && (
                  <span className="audit-target">
                    target: {log.targetUser.displayName || log.targetUser.name}
                  </span>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <span className="audit-meta">
                    {JSON.stringify(log.details)}
                  </span>
                )}
              </div>
              <div className="audit-log-time">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}