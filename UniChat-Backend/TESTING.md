# UniChat Testing Guide

## System Overview

UniChat is a real-time chat application with Discord-like server and channel functionality.

### Architecture
- **Backend**: Node.js + Express + MongoDB + Socket.io
- **Frontend**: React + Vite
- **Port**: 9121 (both API and Socket.io)
- **Database**: MongoDB (UniChatDataBase)

## Fixed Issues

### 1. Port Configuration ✓
- Backend runs on port 9121 (configured in `.env`)
- Frontend `.env` correctly points to `http://localhost:9121`
- Socket.io configured for port 9121

### 2. API Endpoint Mismatch ✓
- **Issue**: Frontend was calling `/chat/create` but backend had `/chat`
- **Fix**: Updated frontend to use correct endpoint `/chat` with `participantId` parameter

### 3. User ID vs Username Inconsistency ✓
- **Issue**: Chat model stored usernames, but controller expected user IDs
- **Fix**: Updated chat controller to:
  - Convert user IDs to usernames when creating/finding chats
  - Query chats by username instead of user ID
  - Maintain consistency throughout the system

### 4. Health Endpoint Route Order ✓
- **Issue**: Health endpoint was after authenticated routes, causing auth errors
- **Fix**: Moved health endpoint before authenticated routes in server.js

## New Features: Discord-like Server & Channel System

### Backend Models

#### 1. Server Model (`models/Server.js`)
```javascript
{
  name: String (required),
  icon: String (optional),
  owner: ObjectId (ref: User),
  members: [{
    user: ObjectId (ref: User),
    role: 'owner' | 'admin' | 'member',
    joinedAt: Date
  }],
  inviteCode: String (unique, auto-generated),
  description: String
}
```

#### 2. Channel Model (`models/Channel.js`)
```javascript
{
  name: String (required),
  type: 'text' | 'voice',
  server: ObjectId (ref: Server),
  position: Number,
  description: String,
  createdBy: ObjectId (ref: User)
}
```

#### 3. Updated Chat Model (`models/Chat.js`)
```javascript
{
  type: 'dm' | 'channel',
  participants: [String], // For DMs
  channel: ObjectId (ref: Channel), // For channel messages
  server: ObjectId (ref: Server), // For channel messages
  messages: [{
    sender: String,
    senderId: ObjectId (ref: User),
    text: String,
    timestamp: Date
  }]
}
```

### API Endpoints

#### Server Endpoints
- `POST /api/servers` - Create a new server
- `GET /api/servers` - Get all servers for current user
- `GET /api/servers/:serverId` - Get server details
- `PUT /api/servers/:serverId` - Update server (owner/admin only)
- `DELETE /api/servers/:serverId` - Delete server (owner only)
- `POST /api/servers/join` - Join server by invite code
- `POST /api/servers/:serverId/leave` - Leave server
- `POST /api/servers/:serverId/kick/:memberId` - Kick member (owner/admin only)

#### Channel Endpoints
- `POST /api/servers/:serverId/channels` - Create channel (owner/admin only)
- `GET /api/servers/:serverId/channels` - Get all channels in server
- `PUT /api/channels/:channelId` - Update channel (owner/admin only)
- `DELETE /api/channels/:channelId` - Delete channel (owner/admin only)
- `GET /api/channels/:channelId/messages` - Get channel messages

#### Existing Chat Endpoints (Fixed)
- `POST /api/chat` - Create/get DM chat between users
- `GET /api/chat/chats` - Get all DMs for current user
- `GET /api/chat/chat/:chatId/messages` - Get DM messages

### Socket.io Events

#### Client → Server
- `sendMessage` - Send a DM message (`{ receiverId, text, chatId }`)
- `joinVoiceChannel` - Join a voice channel (`{ channelId, userId }`)
- `leaveVoiceChannel` - Leave a voice channel (`{ channelId, userId }`)
- `typing` - Send typing indicator (`{ userId, chatId }`)
- `initiateCall` - Start a voice call (`{ chatId, callerId, targetId, callRoomId }`)
- `acceptCall` - Accept an incoming call (`{ callRoomId, callerId }`)
- `endCall` - End an active call (`{ callRoomId }`)

#### Server → Client
- `receiveMessage` - Receive a new DM message
- `presence-list` - Full list of online user IDs on connect (`{ userIds }`)
- `presence-update` - Individual user online/offline updates (`{ userId, online }`)
- `messageSent` - Confirm DM message was sent
- `channelMessage` - Real-time channel message broadcast
- `userTyping` - Typing indicator from another user
- `incomingCall` - Incoming voice call notification
- `callAccepted` - Call was accepted by the target
- `callEnded` - Call was ended

## Frontend Structure

### Three-Panel Layout (Discord-like)

#### 1. Server Sidebar (Leftmost - 72px width)
- Home button (DMs)
- Server icons (circular, expand on hover)
- Add Server button (+)
- Join Server button (🚪)
- User panel at bottom

#### 2. Channel Sidebar (Second Panel - 240px width)
- Server header with name
- Create channel button (+)
- Channel list (# channels)
- OR Direct Messages list with search

#### 3. Main Chat Area (Right Panel - Flexible)
- Chat header with channel name
- Messages container
- Message input at bottom

### Modals
- Create Server Modal
- Join Server Modal
- Create Channel Modal
- User Profile Modal
- Notifications Modal

## Testing Instructions

### 1. Start the Backend Server
```bash
cd UniChat-Backend
npm start
```

Expected output:
```
✅ Connected to MongoDB
🚀 Server running on port 9121
📡 API URL: http://localhost:9121/api
```

### 2. Test Health Endpoint
```bash
curl -X GET http://localhost:9121/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "UniChat API is running"
}
```

### 3. Start the Frontend
```bash
cd UniChat-Frontend
npm run dev
```

Frontend should open at `http://localhost:5173`

### 4. Test User Registration/Login
1. Open browser to `http://localhost:5173`
2. Register a new account or login
3. Complete profile if prompted

### 5. Test Server Features
1. Click "+" button in server sidebar
2. Enter server name and description
3. Click "Create"
4. Verify server appears in sidebar
5. Click on server icon
6. Verify default #general channel is created

### 6. Test Channel Features
1. Select a server
2. Click "+" button in server header
3. Enter channel name (e.g., "random")
4. Select type (text/voice)
5. Click "Create"
6. Verify channel appears in channel list

### 7. Test Channel Messaging
1. Select a channel
2. Type a message in the input box
3. Press Enter or click send button
4. Verify message appears in chat
5. Open another browser/incognito window
6. Login with different user
7. Join same server (need invite code)
8. Send messages in same channel
9. Verify real-time messaging works

### 8. Test DM Features
1. Click Home button (🏠) in server sidebar
2. Search for a user in the search bar
3. Click chat button (💬) next to user
4. Verify DM is created
5. Send messages
6. Verify real-time messaging works

### 9. Test Server Management
1. As server owner:
   - Create channels
   - Delete channels
   - Update server name/description
   - Delete server
2. As server member:
   - Send messages
   - Leave server
   - Cannot create/delete channels

### 10. Test Socket.io Real-time Features
1. Open two browser windows with different users
2. Both users join same server/channel
3. Send message from one user
4. Verify message appears instantly in other user's window
5. Verify online status updates

## Database Collections

### Users
- Stores user profiles, credentials, friends, notifications

### Servers
- Stores server information, members, invite codes

### Channels
- Stores channel information linked to servers

### Chats
- Stores both DM and channel messages
- Type field distinguishes between 'dm' and 'channel'

## Known Limitations

1. **Voice Channels**: UI exists but voice functionality not implemented
2. **File Uploads**: Not implemented yet
3. **Message Editing/Deletion**: Not implemented yet
4. **User Roles**: Basic owner/admin/member roles implemented
5. **Server Icons**: Can be added but not required

## Troubleshooting

### Port Already in Use
```bash
# Kill existing node processes
pkill -f "node server.js"

# Or find and kill specific process
lsof -ti:9121 | xargs kill -9
```

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGO_URI in `.env` file
- Default: `mongodb://localhost:27017/UniChatDataBase`

### Socket.io Connection Issues
- Check browser console for errors
- Verify VITE_SOCKET_URL in frontend `.env`
- Ensure CORS is configured correctly in server.js

### Messages Not Sending
- Check browser console for errors
- Verify user is logged in (check localStorage for token)
- Check network tab for failed API calls
- Verify chatId is correct

## Next Steps for Enhancement

1. Implement voice channel functionality
2. Add file/image upload support
3. Implement message editing and deletion
4. Add message reactions
5. Implement user mentions (@username)
6. Add message threading/replies
7. Implement server roles and permissions
8. Add server categories
9. Implement message search
10. Add typing indicators
11. Implement read receipts
12. Add message pinning
13. Implement server analytics
14. Add mobile app support

## Success Criteria

✅ Backend server starts without errors
✅ Health endpoint returns 200 OK
✅ MongoDB connection successful
✅ Socket.io connection established
✅ Users can register/login
✅ Users can create servers
✅ Users can create channels
✅ Users can send/receive messages in real-time
✅ Users can join servers via invite code
✅ Users can send DMs to other users
✅ Discord-like three-panel UI implemented
✅ Online status tracking works
✅ All CRUD operations work for servers and channels