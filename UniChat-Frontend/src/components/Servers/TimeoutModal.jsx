import { useState } from 'react';

const TIMEOUT_OPTIONS = [
  { value: '60', label: '1 Minute' },
  { value: '300', label: '5 Minutes' },
  { value: '900', label: '15 Minutes' },
  { value: '3600', label: '1 Hour' },
  { value: '86400', label: '1 Day' }
];

export function TimeoutModal({ serverId, memberId, onClose }) {
  const [duration, setDuration] = useState('300');
  const [reason, setReason] = useState('');
  const [executing, setExecuting] = useState(false);

  const handleTimeout = async () => {
    setExecuting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/timeout/${memberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: reason || 'Timeout applied',
          duration
        })
      });
      if (res.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Error applying timeout:', error);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="timeout-modal">
      <div className="modal-header">
        <h3>Timeout Member</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="form-group">
        <label>Duration</label>
        <select value={duration} onChange={(e) => setDuration(e.target.value)}>
          {TIMEOUT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Reason (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for timeout"
        />
      </div>

      <div className="form-actions">
        <button className="danger-btn" onClick={handleTimeout} disabled={executing}>
          {executing ? 'Applying...' : 'Apply Timeout'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}