# UniChat Documentation — Updated

## Phase 4: Frontend Architecture Refactor (Completed)

### Architecture Overview

The frontend has been transformed from a monolithic `Home.jsx` (1410 lines) into a modular architecture following patterns used by Discord, WhatsApp Web, and Slack.

### Folder Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── AppLayout.jsx      # Top-level layout container
│   │   ├── AppLayout.css
│   │   ├── Sidebar.jsx         # Tabbed sidebar (Servers/Channels)
│   │   └── MainPanel.jsx       # Chat panel (header, body, input)
│   ├── Chat/
│   │   ├── ChatHeader.jsx      # Channel/Dm header
│   │   ├── ChatBody.jsx        # Message list container
│   │   ├── MessageList.jsx     # Scrollable message list
│   │   ├── MessageItem.jsx     # Individual message (React.memo)
│   │   ├── MessageInput.jsx    # Text input with send
│   │   └── TypingIndicator.jsx # Live typing indicator
│   ├── Sidebar/
│   │   ├── ServerSidebar.jsx   # Server icon list
│   │   ├── ChannelSidebar.jsx  # Channel list
│   │   └── ConversationItem.jsx # DM conversation item (React.memo)
│   ├── Profile/                # User profile components
│   ├── Notifications/          # Notification panel components
│   ├── Voice/                  # Voice call placeholder
│   ├── Error/
│   │   └── ErrorBoundary.jsx   # Error boundary component
│   ├── Loading/
│   │   └── LoadingSpinner.jsx  # Loading spinner component
│   └── ... (Login, UserProfile, etc.)
├── contexts/
│   ├── AuthContext.jsx         # Authentication state + hooks
│   ├── ChatContext.jsx         # Conversations, messages, chat operations
│   ├── NotificationContext.jsx # Notifications + unread counts
│   └── SocketContext.jsx       # Socket.io connection (existing)
├── hooks/                      # Ready for future custom hooks
├── pages/
│   └── HomePage.jsx            # Home page component
├── services/
│   └── api.js                  # All API service functions
├── utils/
│   ├── constants.js            # App-wide constants
│   ├── helpers.js              # Utility helpers (sorting, grouping)
│   ├── formatters.js           # Date/time/string formatting
│   └── validators.js           # Input validation functions
├── layouts/                    # Ready for future layout components
├── assets/                     # Static assets
└── styles/                     # Global styles (ready)
```

### Context Architecture

#### AuthContext
- `user` — current logged-in user object
- `loading` — authentication loading state
- `login(credentials)` — authenticate and set user
- `register(userData)` — create new account
- `logout()` — clear session
- `refreshProfile()` — reload user profile
- `isAuthenticated` — boolean flag
- `token` — raw JWT token

#### ChatContext
- `conversations` — list of DM conversations
- `selectedConversation` — currently active conversation
- `messages` — map of conversationId → message array
- `loading` — message loading state
- `sending` — message send in-progress state
- `typingUsers` — map of chatId → typing username
- `unreadCounts` — map of userId → unread count
- `sendMessage(conversationId, text)` — send a message
- `editMessage(conversationId, messageId, text)` — edit a message
- `deleteMessage(conversationId, messageId)` — soft delete
- `loadMessages(conversationId, cursor)` — paginated load
- `loadOlderMessages(conversationId)` — infinite scroll
- `selectConversation(conversation)` — set active conversation

#### NotificationContext
- `notifications` — list of notifications
- `unreadCount` — count of unread notifications
- `showNotifications` — panel visibility
- `loadNotifications()` — fetch notifications
- `markAsRead(notificationId)` — mark single as read
- `markAllAsRead()` — mark all as read
- `addNotification(notification)` — add new notification
- `toggleNotifications()` — toggle panel

#### SocketContext (existing)
- `socket` — Socket.io instance
- `isConnected` — connection state

### Performance Improvements
- `React.memo` on `MessageItem`, `ConversationItem`
- `useMemo` for context values and sorted data
- `useCallback` for all handler functions
- `lazy()` + `Suspense` for Login component (code splitting)
- Memoized `MessageList` prevents re-rendering all messages on unrelated state changes

### State Management
- Shared state moved from `Home.jsx` into context providers
- Component-local state only where truly needed (e.g., form input)
- No prop drilling — all contexts provide Hooks (`useAuth()`, `useChat()`, etc.)
- Removed `window.updateCurrentUser` global

### Key Design Patterns
- **Separation of Concerns**: Each component has a single responsibility
- **Container/Presentational**: Layout components handle structure, Chat components handle display
- **Hook-based Access**: Contexts expose Hooks (`useChat()`) instead of raw context objects
- **Centralized API**: All API calls go through `services/api.js` with consistent auth headers
- **Validation**: Input validation in `utils/validators.js`
- **Error Boundaries**: `ErrorBoundary` component wraps the app for graceful error handling

---

## Phase 1-3 Summary

### Phase 1 — Socket Foundation
- Single socket connection via SocketContext
- JWT authentication in socket handshake (`auth: { token }`)
- ObjectId-based online user tracking (`OnlineUsersManager`)
- Multi-tab support (one user, multiple socket IDs)
- Event-driven presence (`presence-list`, `presence-update`)
- No polling

### Phase 2 — Database Architecture
- `Conversation` model (container for chats/channels)
- `Message` model (separate collection, paginated)
- `Attachment` schema prepared (images, video, files, voice)
- Proper MongoDB indexes for queries
- Cursor-based pagination (no `skip()`)
- Message statuses: sent, delivered, read
- Read receipts, soft delete, edit support

### Phase 3 — Production Messaging
- Full message lifecycle: send → delivered → read
- Offline message delivery (stored as "sent", delivered on reconnect)
- Typing indicators with debounce/throttle
- Enhanced presence (online, offline, lastSeen)
- Message editing, soft delete, reaction architecture
- Search support (messages, conversations, date filtering)
- New socket events for full lifecycle

### Phase 4 — Frontend Architecture (This Phase)
- Modular component architecture
- Context-based state management
- API service layer
- Performance optimizations (memo, lazy loading)
- Error boundaries and loading states
