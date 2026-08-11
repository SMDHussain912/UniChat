import { ChatHeader } from '../Chat/ChatHeader';
import { ChatBody } from '../Chat/ChatBody';
import { MessageInput } from '../Chat/MessageInput';
import { TypingIndicator } from '../Chat/TypingIndicator';

export function MainPanel() {
  return (
    <div className="main-panel">
      <ChatHeader />
      <ChatBody />
      <TypingIndicator />
      <MessageInput />
    </div>
  );
}