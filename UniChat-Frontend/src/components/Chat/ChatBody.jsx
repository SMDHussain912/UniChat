import { useChat } from '../../contexts/ChatContext';
import { MessageList } from './MessageList';
import './Chat.css';

export function ChatBody() {
  const { messages, selectedConversation } = useChat();
  const convMessages = messages[selectedConversation?._id] || [];

  return (
    <div className="chat-body">
      <MessageList messages={convMessages} />
    </div>
  );
}
