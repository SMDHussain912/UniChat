import { useState, useEffect, useRef, useCallback } from 'react';
import './Home.css';
import { io } from "socket.io-client";
import UserProfile from './UserProfile';
import Notifications from './Notifications';
import { IncomingCallModal } from './Call/IncomingCallModal';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const API_URL = import.meta.env.VITE_API_URL;

// Helper: format message time
function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: get date label for message grouping
function getDateLabel(date) {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (msgDate.toDateString() === today.toDateString()) return 'Today';
  if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return msgDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

// Helper: check if two dates are on different days
function isDifferentDay(date1, date2) {
  if (!date1 || !date2) return true;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() !== d2.toDateString();
}

// Message status icon component
function MessageStatus({ status }) {
  if (status === 'sending') return <span className="msg-status sending">◌</span>;
  if (status === 'sent') return <span className="msg-status sent">✓</span>;
  if (status === 'delivered') return <span className="msg-status delivered">✓✓</span>;
  if (status === 'read') return <span className="msg-status read">✓✓</span>;
  return null;
}

function Home({ user }) {
  // View state: 'servers' | 'channels' | 'chat'
  const [currentView, setCurrentView] = useState('servers');
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  
  // Message state
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({});
  const [messageStatuses, setMessageStatuses] = useState({}); // { messageId: 'sending'|'sent'|'delivered'|'read' }
  
  // Data state
  const [servers, setServers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [dms, setDms] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Profile and notifications
  const [showProfile, setShowProfile] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  // Modals
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showJoinServerModal, setShowJoinServerModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      }
    }, 50);
  }, []);

  // Load initial data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    loadServers();
    loadDMs();
    loadNotifications();
    loadCurrentUserProfile();
    loadFriendRequests();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Listen for new messages (real-time incoming)
    socket.on("new-message", (data) => {
      const convId = data.conversationId;
      const isCurrentChat = selectedChannel?._id === convId;
      
      // Add message to state
      setMessages(prev => {
        const existing = prev[convId] || [];
        // Avoid duplicates
        if (existing.some(m => m.id === data.id)) return prev;
        return {
          ...prev,
          [convId]: [...existing, {
            id: data.id,
            text: data.text,
            sender: data.senderId === user.id ? 'me' : 'them',
            senderName: data.sender,
            time: formatTime(data.createdAt),
            timestamp: data.createdAt,
            status: data.senderId === user.id ? 'sent' : null
          }]
        };
      });

      // Update DM list with last message
      setDms(prev => prev.map(dm => 
        dm._id === convId ? { ...dm, lastMessage: data.text, time: formatTime(data.createdAt) } : dm
      ));

      if (isCurrentChat) {
        scrollToBottom();
        // Mark as read if we're viewing this conversation
        socket.emit("message-read", { conversationId: convId, messageId: data.id });
      }
    });

    // Listen for message sent confirmation (own messages)
    socket.on("message-sent", (data) => {
      setMessages(prev => {
        const msgs = prev[data.conversationId] || [];
        // Find the optimistic message and update its ID and status
        const updated = msgs.map(m => 
          m.id === data.id || (m.tempId && m.tempId === data.id)
            ? { ...m, id: data.id, status: 'sent' }
            : m
        );
        return { ...prev, [data.conversationId]: updated };
      });
      setMessageStatuses(prev => ({ ...prev, [data.id]: 'sent' }));
    });

    // Listen for message delivered
    socket.on("message-delivered", (data) => {
      setMessages(prev => {
        const msgs = prev[data.conversationId] || [];
        const updated = msgs.map(m => 
          m.id === data.messageId ? { ...m, status: 'delivered' } : m
        );
        return { ...prev, [data.conversationId]: updated };
      });
      setMessageStatuses(prev => ({ ...prev, [data.messageId]: 'delivered' }));
    });

    // Listen for message read
    socket.on("message-read", (data) => {
      setMessages(prev => {
        const msgs = prev[data.conversationId] || [];
        const updated = msgs.map(m => 
          m.id === data.messageId ? { ...m, status: 'read' } : m
        );
        return { ...prev, [data.conversationId]: updated };
      });
      setMessageStatuses(prev => ({ ...prev, [data.messageId]: 'read' }));
    });

    // Listen for online users (presence list on connect)
    socket.on("presence-list", (data) => {
      setOnlineUserIds(new Set(data.userIds));
    });

    // Listen for individual presence updates
    socket.on("presence-update", (data) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        if (data.online) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Listen for typing indicators
    socket.on("userTyping", (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.chatId]: data.username
      }));
      
      setTimeout(() => {
        setTypingUsers(prev => {
          const newState = { ...prev };
          delete newState[data.chatId];
          return newState;
        });
      }, 3000);
    });

    // Listen for notifications
    socket.on("newNotification", (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Listen for channel messages (real-time for server text channels)
    socket.on("channelMessage", (data) => {
      const currentChannelId = selectedChannel?._id;
      if (currentChannelId && data.channelId === currentChannelId) {
        setMessages(prev => ({
          ...prev,
          [currentChannelId]: [...(prev[currentChannelId] || []), {
            id: Date.now(),
            text: data.text,
            sender: data.senderId === user.id ? 'me' : 'them',
            time: formatTime(data.timestamp),
            timestamp: data.timestamp
          }]
        }));
        scrollToBottom();
      }
    });

    // Listen for incoming calls - show as modal overlay
    socket.on("incoming-call", (data) => {
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callType: data.callType,
        callerAvatar: data.callerAvatar
      });
    });

    // Listen for call accepted
    socket.on("call-accepted", (data) => {
      if (selectedChannel?.callId === data.callId) {
        setSelectedChannel(prev => ({
          ...prev,
          callId: data.callId,
          callStatus: 'connected'
        }));
      }
    });

    // Listen for call ended
    socket.on("call-ended", (data) => {
      if (selectedChannel?.callId === data.callId) {
        setCurrentView('chat');
        setSelectedChannel(null);
      }
    });

    // Listen for call rejected
    socket.on("call-rejected", (data) => {
      setCurrentView('chat');
      setSelectedChannel(null);
    });

    return () => {
      socket.off("new-message");
      socket.off("message-sent");
      socket.off("message-delivered");
      socket.off("message-read");
      socket.off("presence-list");
      socket.off("presence-update");
      socket.off("userTyping");
      socket.off("newNotification");
      socket.off("channelMessage");
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-ended");
      socket.off("call-rejected");
    };
  }, [selectedChannel, selectedServer, user.id]);

  // Load servers
  const loadServers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

  // Load DMs
  const loadDMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/chat`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const conversations = data.conversations || [];
        const formattedChats = conversations.map(chat => {
          const lastMsg = chat.lastMessage;
          // Get the other participant (not the current user)
          const otherParticipant = chat.participants?.find(p => p._id !== user.id) || null;
          const participantDisplayName = otherParticipant?.displayName || otherParticipant?.name || 'Unknown';
          const participantUsername = otherParticipant?.name || null;
          const participantAvatar = otherParticipant?.avatar || null;
          const participantUserId = otherParticipant?._id || null;
          
          return {
            _id: chat._id,
            name: participantDisplayName,
            username: participantUsername,
            avatar: participantAvatar ? participantAvatar : (participantDisplayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
            lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
            time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            unread: chat.unreadCount || 0,
            online: participantUserId !== null && onlineUserIds.has(participantUserId),
            otherUserId: participantUserId
          };
        });
        setDms(formattedChats);
      }
    } catch (error) {
      console.error('Error loading DMs:', error);
    }
  };

  // Load channels for a server
  const loadChannels = async (serverId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        const unread = data.notifications?.filter(n => !n.read).length || 0;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Load current user profile
  const loadCurrentUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

if (response.ok) {
           const data = await response.json();
           setCurrentUserProfile(data.user);
         }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Load friend requests
  const loadFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/friend-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  // Search users
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/users/search?query=${encodeURIComponent(searchQuery)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.users || []);
            setShowSearchResults(true);
          }
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Handle server selection
  const handleServerSelect = async (server) => {
    setSelectedServer(server);
    setSelectedChannel(null);
    setCurrentView('channels');
    await loadChannels(server._id);
  };

  // Handle channel selection
  const handleChannelSelect = async (channel) => {
    setSelectedChannel(channel);
    setCurrentView('chat');
    
    // If voice channel, join voice chat
    if (channel.type === 'voice') {
      handleJoinVoiceChannel(channel);
      return;
    }
    
    // Join the channel socket room for real-time messages
    const sock = socketRef.current;
    if (sock) {
      sock.emit("join-channel", { channelId: channel._id });
    }
    
    // Load channel messages for text channels
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/channels/${channel._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map(msg => ({
          id: msg._id || Date.now() + Math.random(),
          text: msg.text,
          sender: msg.sender === user.name ? 'me' : 'them',
          time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(prev => ({
          ...prev,
          [channel._id]: formattedMessages
        }));
      }
    } catch (error) {
      console.error('Error loading channel messages:', error);
    }
  };

  // Handle voice call in DM - uses HTTP API to create a real Call document
  const handleVoiceCall = async (chat) => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the HTTP API to create a real call in the database
      const response = await fetch(`${API_URL}/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: chat.otherUserId,
          callType: 'voice'
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to initiate call');
      }

      const data = await response.json();
      const call = data.call || data;

      // Set up call UI with the real call ID from the database
      setSelectedChannel({
        ...chat,
        isCall: true,
        callId: call._id,
        callStatus: 'calling'
      });
      setCurrentView('call');
    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Failed to start call: ' + error.message);
    }
  };

  // Handle end call - uses the real call ID from the database
  const handleEndCall = () => {
    const sock = socketRef.current;
    if (selectedChannel?.callId && sock) {
      sock.emit("hangup", {
        callId: selectedChannel.callId
      });
    }
    setCurrentView('chat');
    setSelectedChannel(null);
  };

  // Join voice channel
  const handleJoinVoiceChannel = (channel) => {
    const sock = socketRef.current;
    if (sock) {
      sock.emit("joinVoiceChannel", {
        channelId: channel._id,
        userId: user.id
      });
    }
    setCurrentView('voice');
  };

  // Leave voice channel
  const handleLeaveVoiceChannel = () => {
    const sock = socketRef.current;
    if (selectedChannel && sock) {
      sock.emit("leaveVoiceChannel", {
        channelId: selectedChannel._id,
        userId: user.id
      });
    }
    setCurrentView('channels');
    setSelectedChannel(null);
  };

  // Handle DM selection
  const handleDMSelect = async (chat) => {
    setSelectedChannel(chat);
    setSelectedServer(null);
    setCurrentView('chat');
    
    // Join the socket room for this conversation
    const sock = socketRef.current;
    if (sock) {
      sock.emit("join-conversation", { conversationId: chat._id });
    }
    
    // Load DM messages
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/chat/${chat._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const messagesData = data.messages || [];
        const formattedMessages = messagesData.map(msg => ({
          id: msg.id || msg._id || Date.now() + Math.random(),
          text: msg.text,
          sender: msg.senderId === user.id ? 'me' : 'them',
          senderName: msg.sender,
          time: formatTime(msg.createdAt),
          timestamp: msg.createdAt,
          status: msg.senderId === user.id ? 'sent' : null
        }));
        setMessages(prev => ({
          ...prev,
          [chat._id]: formattedMessages
        }));
        
        // Mark last message as read
        if (formattedMessages.length > 0 && sock) {
          const lastMsg = formattedMessages[formattedMessages.length - 1];
          sock.emit("message-read", { conversationId: chat._id, messageId: lastMsg.id });
        }
        
        scrollToBottom(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChannel) return;

    const token = localStorage.getItem('token');
    const text = message;
    setMessage('');

    if (selectedServer) {
      // Channel message - send via HTTP API
      try {
        const response = await fetch(`${API_URL}/channels/${selectedChannel._id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        });

        if (response.ok) {
          const newMessage = {
            id: Date.now(),
            text,
            sender: 'me',
            time: formatTime(new Date()),
            timestamp: new Date().toISOString(),
            status: 'sent'
          };
          setMessages(prev => ({
            ...prev,
            [selectedChannel._id]: [...(prev[selectedChannel._id] || []), newMessage]
          }));
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error sending channel message:', error);
      }
    } else {
      const sock = socketRef.current;
      if (sock) {
        // Optimistic add - show message immediately
        const tempId = 'temp-' + Date.now();
        const optimisticMsg = {
          id: tempId,
          tempId,
          text,
          sender: 'me',
          time: formatTime(new Date()),
          timestamp: new Date().toISOString(),
          status: 'sending'
        };
        setMessages(prev => ({
          ...prev,
          [selectedChannel._id]: [...(prev[selectedChannel._id] || []), optimisticMsg]
        }));
        scrollToBottom();

        // Send via socket with conversationId
        sock.emit("sendMessage", {
          conversationId: selectedChannel._id,
          text
        });
      }
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    const sock = socketRef.current;
    if (selectedChannel && sock) {
      sock.emit("typing-start", {
        conversationId: selectedChannel._id
      });
    }
  };

  // Create server
  const handleCreateServer = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const description = e.target.description.value;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateServerModal(false);
        loadServers();
        handleServerSelect(data.server);
      }
    } catch (error) {
      console.error('Error creating server:', error);
    }
  };

  // Join server
  const handleJoinServer = async (e) => {
    e.preventDefault();
    const inviteCode = e.target.inviteCode.value;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteCode })
      });

      if (response.ok) {
        const data = await response.json();
        setShowJoinServerModal(false);
        loadServers();
        handleServerSelect(data.server);
      }
    } catch (error) {
      console.error('Error joining server:', error);
    }
  };

  // Create channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const type = e.target.type.value;
    const description = e.target.description.value;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${selectedServer._id}/channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, type, description })
      });

      if (response.ok) {
        setShowCreateChannelModal(false);
        loadChannels(selectedServer._id);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  // Get initials for avatar
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handle user click from search
  const handleUserClick = (userId) => {
    setProfileUserId(userId);
    setShowProfile(true);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Handle start chat from search
const handleStartChat = async (otherUser) => {
     try {
       const token = localStorage.getItem('token');
       
       // Check if chat already exists by other user's ID
       const existingChat = dms.find(chat => chat.otherUserId === otherUser.id);
       if (existingChat) {
         handleDMSelect(existingChat);
         setShowSearchResults(false);
         setSearchQuery('');
         return;
       }

       // Create new chat
       const response = await fetch(`${API_URL}/chat`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           participantId: otherUser.id
         })
       });

       if (response.ok) {
         const newChat = await response.json();
         loadDMs();
         handleDMSelect({
           _id: newChat._id,
           name: otherUser.name,
           avatar: otherUser.avatar || getInitials(otherUser.name),
           otherUserId: otherUser.id
         });
         setShowSearchResults(false);
         setSearchQuery('');
       }
     } catch (error) {
       console.error('Error creating chat:', error);
     }
   };

  // Get last seen
  const getLastSeen = (userId) => {
    const lastSeen = currentUserProfile?.lastSeen;
    const isOnline = onlineUserIds.has(userId);
    if (isOnline) return 'online';
    if (lastSeen) return new Date(lastSeen).toLocaleString();
    return 'offline';
  };

  return (
    <div className="home-container">
      {/* Server Sidebar - Leftmost Panel */}
      <div className="server-sidebar">
        <div className="server-list">
          {/* Home/DM Button */}
          <div 
            className={`server-icon ${!selectedServer ? 'active' : ''}`}
            onClick={() => {
              setSelectedServer(null);
              setCurrentView('servers');
            }}
            title="Direct Messages"
          >
            <span>🏠</span>
          </div>

          {/* Server Icons */}
          {servers.map(server => (
            <div
              key={server._id}
              className={`server-icon ${selectedServer?._id === server._id ? 'active' : ''}`}
              onClick={() => handleServerSelect(server)}
              title={server.name}
            >
              {server.icon ? (
                <img src={server.icon} alt={server.name} />
              ) : (
                <span>{getInitials(server.name)}</span>
              )}
            </div>
          ))}

          {/* Add Server Button */}
          <div 
            className="server-icon add-server"
            onClick={() => setShowCreateServerModal(true)}
            title="Add a Server"
          >
            <span>+</span>
          </div>

          {/* Join Server Button */}
          <div 
            className="server-icon join-server"
            onClick={() => setShowJoinServerModal(true)}
            title="Join a Server"
          >
            <span>🚪</span>
          </div>
        </div>

        {/* User Panel at Bottom */}
        <div className="user-panel">
          <div className="user-avatar" onClick={() => {
            setProfileUserId(user.id);
            setShowProfile(true);
          }}>
            {currentUserProfile?.avatar ? (
              <img src={currentUserProfile.avatar} alt={user.name} />
            ) : (
              user.name.split(' ').map(n => n[0]).join('').toUpperCase()
            )}
          </div>
        </div>
      </div>

      {/* Channel/DM List - Second Panel */}
      <div className="channel-sidebar">
        {selectedServer ? (
          // Server Header
          <>
            <div className="server-header">
              <h3>{selectedServer.name}</h3>
              <div className="server-header-actions">
                <button 
                  className="icon-btn"
                  onClick={() => setShowCreateChannelModal(true)}
                  title="Create Channel"
                >
                  +
                </button>
                <button 
                  className="icon-btn"
                  onClick={() => setShowServerSettings(true)}
                  title="Server Settings"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* Channels List */}
            <div className="channels-list">
              {channels.map(channel => (
                <div
                  key={channel._id}
                  className={`channel-item ${selectedChannel?._id === channel._id ? 'active' : ''}`}
                  onClick={() => handleChannelSelect(channel)}
                >
                  <span className="channel-icon">#</span>
                  <span className="channel-name">{channel.name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          // DMs List
          <>
            <div className="server-header">
              <h3>Direct Messages</h3>
            </div>

            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search users..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && <div className="search-spinner"></div>}
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(result => (
                    <div 
                      key={result.id} 
                      className="search-result-item"
                    >
                      <div 
                        className="search-result-avatar"
                        onClick={() => handleUserClick(result.id)}
                      >
                        {result.avatar ? (
                          <img src={result.avatar} alt={result.name} />
                        ) : (
                          getInitials(result.name)
                        )}
                        <span className={`online-indicator ${onlineUserIds.has(result.id) ? 'online' : 'offline'}`}></span>
                      </div>
                      <div className="search-result-info">
                        <div 
                          className="search-result-name"
                          onClick={() => handleUserClick(result.id)}
                        >
                          {result.displayName || result.name}
                        </div>
                        <div className="search-result-username">@{result.name}</div>
                      </div>
                      <button 
                        className="chat-btn"
                        onClick={() => handleStartChat(result)}
                        title="Start Chat"
                      >
                        💬
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="channels-list">
              {dms.map(chat => (
                <div
                  key={chat._id}
                  className={`channel-item ${selectedChannel?._id === chat._id ? 'active' : ''}`}
                >
                  <div className="channel-item-content" onClick={() => handleDMSelect(chat)}>
                    <span className="channel-icon">💬</span>
                    <span className="channel-name">{chat.name}</span>
                    {chat.unread > 0 && (
                      <span className="unread-badge">{chat.unread}</span>
                    )}
                  </div>
                  <button 
                    className="voice-call-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoiceCall(chat);
                    }}
                    title="Voice Call"
                  >
                    📞
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area - Right Panel */}
      <div className="chat-main-panel">
        {/* Top Header Bar */}
        <div className="top-header-bar">
          <div className="header-left">
            <h2>{selectedServer ? selectedServer.name : 'Direct Messages'}</h2>
          </div>
          <div className="header-right">
            {/* Profile Button */}
            <button 
              className="header-icon-btn profile-btn"
              onClick={() => {
                setProfileUserId(user.id);
                setShowProfile(true);
              }}
              title="Profile"
            >
              👤
            </button>

            {/* Friend Requests Button */}
            <button 
              className="header-icon-btn friend-requests-btn"
              onClick={() => setShowFriendRequests(true)}
              title="Friend Requests"
            >
              👥
              {friendRequests.length > 0 && (
                <span className="header-badge">{friendRequests.length}</span>
              )}
            </button>

            {/* Notifications Button */}
            <button 
              className="header-icon-btn notifications-btn"
              onClick={() => setShowNotifications(true)}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="header-badge">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {currentView === 'call' && selectedChannel ? (
          // Voice Call View
          <div className="voice-call-container">
            <div className="call-header">
              <div className="call-info">
                <span className="call-icon">📞</span>
                <h3>{selectedChannel.callStatus === 'calling' ? 'Calling...' : selectedChannel.callStatus === 'incoming' ? `Incoming call from ${selectedChannel.callerName}` : 'In Call'}</h3>
              </div>
            </div>
            <div className="call-participants">
              <div className="call-participant">
                <div className="participant-avatar large">
                  {currentUserProfile?.avatar ? (
                    <img src={currentUserProfile.avatar} alt={user.name} />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <span className="participant-name">{user.name} (You)</span>
              </div>
              {selectedChannel.callStatus !== 'calling' && (
                <div className="call-participant">
                  <div className="participant-avatar large">
                    {selectedChannel.avatar ? (
                      <img src={selectedChannel.avatar} alt={selectedChannel.name} />
                    ) : (
                      getInitials(selectedChannel.name)
                    )}
                  </div>
                  <span className="participant-name">{selectedChannel.name}</span>
                </div>
              )}
            </div>
            <div className="call-actions">
              {selectedChannel.callStatus === 'incoming' && (
                <button className="accept-call-btn" onClick={() => {
                  // Accept call using the real call ID
                  const sock = socketRef.current;
                  if (sock && selectedChannel.callId) {
                    sock.emit("answer-call", {
                      callId: selectedChannel.callId
                    });
                  }
                  setSelectedChannel(prev => ({ ...prev, callStatus: 'connected' }));
                }}>
                  ✓ Accept
                </button>
              )}
              <button className="end-call-btn" onClick={handleEndCall}>
                ✕ End Call
              </button>
            </div>
          </div>
        ) : currentView === 'voice' && selectedChannel ? (
          // Voice Channel View
          <div className="voice-channel-container">
            <div className="voice-header">
              <div className="voice-channel-info">
                <span className="voice-icon">🔊</span>
                <h3>{selectedChannel.name}</h3>
              </div>
              <button className="leave-voice-btn" onClick={handleLeaveVoiceChannel}>
                Leave Voice
              </button>
            </div>
            <div className="voice-participants">
              <div className="participant">
                <div className="participant-avatar">
                  {currentUserProfile?.avatar ? (
                    <img src={currentUserProfile.avatar} alt={user.name} />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <span className="participant-name">{user.name} (You)</span>
              </div>
            </div>
          </div>
        ) : selectedChannel ? (
          // Text Channel View
          <div className="text-channel-view">
            <div className="chat-header">
              <div className="chat-header-info">
                <span className="channel-hash">#</span>
                <h3>{selectedChannel.name}</h3>
              </div>
              <div className="chat-header-actions">
                {!selectedServer && selectedChannel?.otherUserId && (
                  <button 
                    className="icon-btn call-btn" 
                    title="Voice Call"
                    onClick={() => handleVoiceCall(selectedChannel)}
                  >
                    📞
                  </button>
                )}
                <button className="icon-btn" title="Search">🔍</button>
                <button className="icon-btn" title="Members">👥</button>
              </div>
            </div>

            {/* Typing Indicator */}
            {typingUsers && typingUsers[selectedChannel._id] && (
              <div className="typing-indicator">
                <span className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                <span className="typing-text">
                  {typingUsers[selectedChannel._id]} is typing...
                </span>
              </div>
            )}

            <div className="messages-container" ref={messagesContainerRef}>
              {(() => {
                const msgs = messages[selectedChannel._id] || [];
                let lastDate = null;
                return msgs.map((msg, idx) => {
                  const showDateSep = isDifferentDay(msg.timestamp, lastDate);
                  lastDate = msg.timestamp;
                  return (
                    <div key={msg.id}>
                      {showDateSep && (
                        <div className="date-separator">
                          <span>{getDateLabel(msg.timestamp)}</span>
                        </div>
                      )}
                      <div className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                        <div className="message-bubble">
                          <p className="message-text">{msg.text}</p>
                          <div className="message-meta">
                            <span className="message-time">{msg.time}</span>
                            {msg.sender === 'me' && <MessageStatus status={msg.status} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-container" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={selectedServer ? `Message #${selectedChannel.name}` : `Message @${selectedChannel.name}`}
                className="message-input"
              />
              <button type="submit" className="send-btn" title="Send">
                ➤
              </button>
            </form>
          </div>
        ) : (
          <div className="no-channel-selected">
            <div className="empty-state">
              <div className="empty-icon">👋</div>
              <h2>Welcome to UniChat!</h2>
              <p>Select a channel or start a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile
          userId={profileUserId || user.id}
          currentUser={user}
          onClose={() => setShowProfile(false)}
          onSendRequest={loadCurrentUserProfile}
        />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <Notifications
          user={user}
          onClose={() => {
            setShowNotifications(false);
            loadNotifications();
          }}
        />
      )}

      {/* Friend Requests Modal */}
      {showFriendRequests && (
        <div className="modal-overlay" onClick={() => setShowFriendRequests(false)}>
          <div className="modal friend-requests-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Friend Requests</h2>
              <button className="close-btn" onClick={() => setShowFriendRequests(false)}>×</button>
            </div>
            <div className="friend-requests-list">
              {friendRequests.length === 0 ? (
                <div className="no-requests">
                  <p>No pending friend requests</p>
                </div>
              ) : (
                friendRequests.map(request => (
                  <div key={request.id} className="friend-request-item">
                    <div className="request-user-info">
                      <div className="request-avatar">
                        {request.sender.avatar ? (
                          <img src={request.sender.avatar} alt={request.sender.name} />
                        ) : (
                          getInitials(request.sender.name)
                        )}
                      </div>
                      <div className="request-details">
                        <h4>{request.sender.displayName || request.sender.name}</h4>
                        <p>@{request.sender.name}</p>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="accept-btn"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(`${API_URL}/users/friend-requests/respond`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ requestId: request.id, accept: true })
                            });
                            
                            if (response.ok) {
                              // Refresh DMs - chat is automatically created by backend
                              await loadDMs();
                            }
                            
                            loadFriendRequests();
                            loadNotifications();
                          } catch (error) {
                            console.error('Error accepting request:', error);
                          }
                        }}
                      >
                        ✓
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            await fetch(`${API_URL}/users/friend-requests/respond`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ requestId: request.id, accept: false })
                            });
                            loadFriendRequests();
                          } catch (error) {
                            console.error('Error rejecting request:', error);
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Server Modal */}
      {showCreateServerModal && (
        <div className="modal-overlay" onClick={() => setShowCreateServerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create a Server</h2>
            <form onSubmit={handleCreateServer}>
              <input
                type="text"
                name="name"
                placeholder="Server Name"
                required
                maxLength={100}
              />
              <textarea
                name="description"
                placeholder="Description (optional)"
                maxLength={500}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateServerModal(false)}>Cancel</button>
                <button type="submit" className="primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Server Modal */}
      {showJoinServerModal && (
        <div className="modal-overlay" onClick={() => setShowJoinServerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Join a Server</h2>
            <form onSubmit={handleJoinServer}>
              <input
                type="text"
                name="inviteCode"
                placeholder="Enter Invite Code"
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowJoinServerModal(false)}>Cancel</button>
                <button type="submit" className="primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className="modal-overlay" onClick={() => setShowCreateChannelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Channel</h2>
            <form onSubmit={handleCreateChannel}>
              <input
                type="text"
                name="name"
                placeholder="Channel Name"
                required
                maxLength={100}
              />
              <select name="type">
                <option value="text">Text</option>
                <option value="voice">Voice</option>
              </select>
              <textarea
                name="description"
                placeholder="Description (optional)"
                maxLength={500}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateChannelModal(false)}>Cancel</button>
                <button type="submit" className="primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server Settings Modal */}
      {showServerSettings && selectedServer && (
        <div className="modal-overlay" onClick={() => setShowServerSettings(false)}>
          <div className="modal server-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Server Settings</h2>
              <button className="close-btn" onClick={() => setShowServerSettings(false)}>×</button>
            </div>
            
            <div className="server-settings-content">
              {/* Server Icon Upload */}
              <div className="settings-section">
                <h3>Server Icon</h3>
                <div className="icon-upload-area">
                  <div className="current-icon">
                    {selectedServer.icon ? (
                      <img src={selectedServer.icon} alt={selectedServer.name} />
                    ) : (
                      <span>{getInitials(selectedServer.name)}</span>
                    )}
                  </div>
                  <input
                    type="file"
                    id="server-icon-input"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('icon', file);
                        try {
                          const token = localStorage.getItem('token');
                          await fetch(`${API_URL}/servers/${selectedServer._id}/icon`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            },
                            body: formData
                          });
                          loadServers();
                        } catch (error) {
                          console.error('Error uploading icon:', error);
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <button 
                    className="upload-btn"
                    onClick={() => document.getElementById('server-icon-input').click()}
                  >
                    Upload Icon
                  </button>
                </div>
              </div>

              {/* Server Info */}
              <div className="settings-section">
                <h3>Server Information</h3>
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{selectedServer.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Owner:</span>
                  <span className="info-value">{selectedServer.owner?.name || 'Unknown'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Members:</span>
                  <span className="info-value">{selectedServer.members?.length || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Invite Code:</span>
                  <span className="info-value">{selectedServer.inviteCode}</span>
                </div>
              </div>

              {/* Members List */}
              <div className="settings-section">
                <h3>Members</h3>
                <div className="members-list">
                  {selectedServer.members?.map(member => (
                    <div key={member.user._id} className="member-item">
                      <div className="member-avatar">
                        {member.user.avatar ? (
                          <img src={member.user.avatar} alt={member.user.name} />
                        ) : (
                          getInitials(member.user.name)
                        )}
                      </div>
                      <div className="member-info">
                        <span className="member-name">{member.user.name}</span>
                        <span className="member-role">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="settings-section danger-zone">
                <h3>Danger Zone</h3>
                <button 
                  className="leave-server-btn"
                  onClick={async () => {
                    if (confirm('Are you sure you want to leave this server?')) {
                      try {
                        const token = localStorage.getItem('token');
                        await fetch(`${API_URL}/servers/${selectedServer._id}/leave`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        setShowServerSettings(false);
                        setSelectedServer(null);
                        loadServers();
                      } catch (error) {
                        console.error('Error leaving server:', error);
                      }
                    }
                  }}
                >
                  Leave Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Modal - Overlay on top of everything */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => {
            const sock = socketRef.current;
            if (sock && incomingCall.callId) {
              sock.emit("answer-call", { callId: incomingCall.callId });
            }
            setIncomingCall(null);
          }}
          onReject={() => {
            const sock = socketRef.current;
            if (sock && incomingCall.callId) {
              sock.emit("reject-call", { callId: incomingCall.callId });
            }
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}

export default Home;