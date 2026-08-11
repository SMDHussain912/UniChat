import { useState } from 'react';

export function WarnModal({ serverId, memberId, onClose }) {
  const [reason, setReason] = useState('');
  const [executing, setExecuting] = useState(false);

  const handleWarn = async () => {
    setExecuting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/warn/${memberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason || 'Warning issued' })
      });
      if (res.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Error warning member:', error);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="warn-modal">
      <div className="modal-header">
        <h3>Warn Member</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="form-group">
        <label>Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Warning reason"
        />
      </div>

      <div className="form-actions">
        <button className="warn-btn" onClick={handleWarn} disabled={executing}>
          {executing ? 'Issuing...' : 'Issue Warning'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}