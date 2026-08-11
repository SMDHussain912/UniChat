import { memo } from 'react';

export const MessageItem = memo(function MessageItem({ message, isOwn }) {
  return (
    <div className={`message ${isOwn ? 'sent' : 'received'}`}>
      <div className="message-avatar" />
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{message.sender}</span>
          <span className="message-time">{message.time}</span>
        </div>
        <div className="message-bubble">
          <p className="message-text">{message.text}</p>
        </div>
      </div>
    </div>
  );
});