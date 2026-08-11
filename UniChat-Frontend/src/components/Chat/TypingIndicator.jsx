import { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';

export function TypingIndicator() {
  const { typingUsers } = useChat();

  if (!typingUsers || Object.keys(typingUsers).length === 0) return null;

  const typingTexts = Object.entries(typingUsers)
    .filter(([_, name]) => name)
    .map(([_, name]) => `${name} is typing...`);

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="typing-text">
        {typingTexts.join(', ')}
      </span>
    </div>
  );
}