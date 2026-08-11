import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { chatService } from '../services/api';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [messageCursors, setMessageCursors] = useState({});
  const [hasMore, setHasMore] = useState({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!token) return;
    loadConversations();
  }, [token]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getChats();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, cursor = null) => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await chatService.getMessages(conversationId, cursor);
      setMessages(prev => ({
        ...prev,
        [conversationId]: cursor
          ? [...(prev[conversationId] || []), ...data.messages]
          : data.messages
      }));
      setHasMore(prev => ({ ...prev, [conversationId]: data.hasMore }));
      setMessageCursors(prev => ({
        ...prev,
        [conversationId]: data.nextCursor
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId, text) => {
    if (!text || !text.trim() || !conversationId) return;
    setSending(true);
    try {
      const data = await chatService.sendMessage(conversationId, text);
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), data.message]
      }));
      setConversations(prev => prev.map(c =>
        c._id === conversationId
          ? { ...c, lastMessage: data.message, updatedAt: data.message.createdAt }
          : c
      ));
      return data.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, []);

  const editMessage = useCallback(async (conversationId, messageId, text) => {
    try {
      const data = await chatService.editMessage(conversationId, messageId, text);
      setMessages(prev => {
        const msgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: msgs.map(m => m.id === messageId ? { ...m, ...data.message } : m)
        };
      });
      return data.message;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, []);

  const deleteMessage = useCallback(async (conversationId, messageId) => {
    try {
      await chatService.deleteMessage(conversationId, messageId);
      setMessages(prev => {
        const msgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: msgs.map(m => m.id === messageId ? { ...m, deleted: true, text: '' } : m)
        };
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  const loadOlderMessages = useCallback(async (conversationId) => {
    const cursor = messageCursors[conversationId];
    if (!cursor || !hasMore[conversationId]) return;
    await loadMessages(conversationId, cursor);
  }, [loadMessages, messageCursors, hasMore]);

  const selectConversation = useCallback((conversation) => {
    setSelectedConversation(conversation);
    setTypingUsers({});
  }, []);

  const value = useMemo(() => ({
    conversations,
    selectedConversation,
    messages,
    loading,
    sending,
    typingUsers,
    unreadCounts,
    hasMore,
    loadConversations,
    loadMessages,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    selectConversation,
    setTypingUsers
  }), [conversations, selectedConversation, messages, loading, sending, typingUsers, unreadCounts, hasMore, loadConversations, loadMessages, loadOlderMessages, sendMessage, editMessage, deleteMessage, selectConversation]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;