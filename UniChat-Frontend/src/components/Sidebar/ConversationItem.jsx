import { memo } from 'react';

export const ConversationItem = memo(function ConversationItem({ conversation, isActive, onClick }) {
  return (
    <div className={`conversation-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="conversation-avatar" />
      <div className="conversation-info">
        <span className="conversation-name">{conversation.name || 'Unknown'}</span>
        <span className="conversation-preview">{conversation.lastMessage?.text || 'No messages'}</span>
      </div>
    </div>
  );
});