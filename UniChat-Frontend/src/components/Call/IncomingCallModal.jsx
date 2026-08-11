import { useState, useEffect } from 'react';
import './Call.css';

export function IncomingCallModal({ call, onAccept, onReject }) {
  const { callType, callerName, callerAvatar } = call;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setVisible(false);
    setTimeout(onAccept, 200);
  };

  const handleReject = () => {
    setVisible(false);
    setTimeout(onReject, 200);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`incoming-call-overlay ${visible ? 'visible' : ''}`}>
      <div className="incoming-call-modal">
        <div className="incoming-call-content">
          {/* Caller Avatar */}
          <div className="caller-avatar">
            {callerAvatar ? (
              <img src={callerAvatar} alt={callerName} />
            ) : (
              <span className="avatar-initials">{getInitials(callerName)}</span>
            )}
          </div>

          {/* Call Info */}
          <div className="call-info">
            <h2 className="caller-name">{callerName || 'Unknown'}</h2>
            <p className="call-status-text">
              {callType === 'video' ? '📹 Video' : '📞 Voice'} call
            </p>
          </div>

          {/* Call Controls */}
          <div className="incoming-call-controls">
            <button
              className="call-control-btn reject"
              onClick={handleReject}
              title="Decline"
            >
              <span className="btn-icon">✕</span>
              <span className="btn-label">Decline</span>
            </button>
            <button
              className="call-control-btn accept"
              onClick={handleAccept}
              title="Accept"
            >
              <span className="btn-icon">✓</span>
              <span className="btn-label">Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
