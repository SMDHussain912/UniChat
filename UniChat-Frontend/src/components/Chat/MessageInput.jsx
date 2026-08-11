import { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { validateMessage } from '../../utils/validators';

export function MessageInput() {
  const [text, setText] = useState('');
  const { sendMessage, selectedConversation, sending } = useChat();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedConversation) return;
    sendMessage(selectedConversation._id, text);
    setText('');
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={sending}
        maxLength={5000}
      />
      <button type="submit" disabled={!text.trim() || sending}>
        Send
      </button>
    </form>
  );
}
