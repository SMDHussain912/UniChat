import { memo } from 'react';
import { MessageItem } from './MessageItem';

export const MessageList = memo(function MessageList({ messages }) {
  return (
    <div className="messages-container">
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} isOwn={msg.sender === 'me'} />
      ))}
    </div>
  );
});