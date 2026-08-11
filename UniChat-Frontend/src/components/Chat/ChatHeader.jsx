export function ChatHeader({ selectedChannel, selectedConversation }) {
  const title = selectedChannel?.name || selectedConversation?.name || 'Chat';
  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <h2>{title}</h2>
      </div>
    </div>
  );
}
