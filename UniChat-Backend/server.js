require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth.route");
const chatRoutes = require("./routes/chat.route");
const profileRoutes = require("./routes/profile.route");
const userRoutes = require("./routes/user.route");
const serverRoutes = require("./routes/server.route");
const channelRoutes = require("./routes/channel.route");
const callRoutes = require("./routes/call.route");
const roleRoutes = require("./routes/role.route");
const inviteRoutes = require("./routes/invite.route");
const auditLogRoutes = require("./routes/auditLog.route");
const moderationRoutes = require("./routes/moderation.route");
const serverMemberRoutes = require("./routes/serverMember.route");
const attachmentRoutes = require("./routes/attachment.route");
const reactionRoutes = require("./routes/reaction.route");
const stickerRoutes = require("./routes/sticker.route");
const channelController = require("./controllers/channel");
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const Call = require("./models/Call");
const Attachment = require("./models/Attachment");
const Sticker = require("./models/Sticker");
const User = require("./models/User");
const ServerModel = require("./models/Server");
const ServerMember = require("./models/ServerMember");
const { handleClientMessage, handleEditMessage, handleDeleteMessage, handleReadReceipt } = require('./controllers/message');
const { startTyping, stopTyping, stopAllTyping } = require('./services/typingIndicator');
const { initiateCall, acceptCall, rejectCall, endCall, sendIceCandidate, sendOffer, sendAnswer, getCallHistory } = require('./services/callService');
const socketAuth = require('./services/socketAuth');
const onlineUsersManager = require("./services/onlineUsers");
const storageService = require('./services/storage');

// In-memory store for active calls (real-time, no DB dependency)
const activeCalls = new Map();

// Update user's lastSeen timestamp on disconnect
async function updateLastSeen(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.lastSeen = new Date();
      await user.save();
    }
  } catch (error) {
    console.error("Error updating lastSeen:", error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route (must be before authenticated routes)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "UniChat API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", profileRoutes);
app.use("/api", userRoutes);
app.use("/api", serverRoutes);
app.use("/api", channelRoutes);
app.use("/api/calls", callRoutes);
app.use("/api", roleRoutes);
app.use("/api", inviteRoutes);
app.use("/api", auditLogRoutes);
app.use("/api", moderationRoutes);
app.use("/api", serverMemberRoutes);
app.use("/api", attachmentRoutes);
app.use("/api", reactionRoutes);
app.use("/api", stickerRoutes);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 9121;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/UniChatDataBase";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    
    server.listen(PORT,"0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API URL: http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

// Pass io to channel controller for real-time broadcasting
channelController.setSocketIO(io);

// Pass io to onlineUsersManager manager for presence broadcasting
onlineUsersManager.setIO(io);

// Socket.IO authentication middleware
io.use(socketAuth);

io.on("connection", async (socket) => {
    const userId = socket.user.id;

    onlineUsersManager.add(userId, socket.id);

    socket.emit('presence-list', {
      userIds: onlineUsersManager.getOnlineUserIds()
    });

    // Handle sending messages
    socket.on("sendMessage", async (data) => {
      try {
        await handleClientMessage(socket, data, io);
      } catch (error) {
        console.error("Error handling message:", error);
        socket.emit("message-error", { error: error.message });
      }
    });

    // Handle editing messages
    socket.on("edit-message", async (data) => {
      try {
        await handleEditMessage(socket, data, io);
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("message-error", { error: error.message });
      }
    });

    // Handle deleting messages
    socket.on("delete-message", async (data) => {
      try {
        await handleDeleteMessage(socket, data, io);
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("message-error", { error: error.message });
      }
    });

    // Handle read receipts
    socket.on("message-read", async (data) => {
      try {
        await handleReadReceipt(socket, data, io);
      } catch (error) {
        console.error("Error handling read receipt:", error);
        socket.emit("message-error", { error: error.message });
      }
    });

    // Handle typing start
    socket.on("typing-start", async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        if (!conversation.participants.some(p => p._id.toString() === userId)) return;

        startTyping(io, conversationId, userId);
      } catch (error) {
        console.error("Error starting typing:", error);
      }
    });

    // Handle typing stop
    socket.on("typing-stop", async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        stopTyping(io, conversationId, userId);
      } catch (error) {
        console.error("Error stopping typing:", error);
      }
    });

    // Handle joining a conversation (for presence tracking)
    socket.on("join-conversation", async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        socket.join(conversationId);
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.unreadCounts.set(userId.toString(), 0);
          await conversation.save();
        }

        io.to(conversationId).emit("user-joined-conversation", {
          conversationId,
          userId
        });
      } catch (error) {
        console.error("Error joining conversation:", error);
      }
    });

    // Handle leaving a conversation
    socket.on("leave-conversation", async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        socket.leave(conversationId);
        stopAllTyping(io, conversationId, userId);

        io.to(conversationId).emit("user-left-conversation", {
          conversationId,
          userId
        });
      } catch (error) {
        console.error("Error leaving conversation:", error);
      }
    });

    // Handle disconnect — update lastSeen and stop all typing
    socket.on("disconnect", async () => {
      onlineUsersManager.remove(socket.id);
      await updateLastSeen(userId);
      stopAllTyping(io, null, userId);
    });

    // Handle joining a text channel for real-time messages
    socket.on("join-channel", (data) => {
      const { channelId } = data;
      if (channelId) {
        socket.join(channelId);
      }
    });

    // Handle voice channel join (preserved from Phase 1)
    socket.on("joinVoiceChannel", (data) => {
      const { channelId } = data;
      socket.join(channelId);
      socket.to(channelId).emit("userJoinedVoice", { userId, channelId });
    });

    // Handle voice channel leave (preserved from Phase 1)
    socket.on("leaveVoiceChannel", (data) => {
      const { channelId } = data;
      socket.to(channelId).emit("userLeftVoice", { userId, channelId });
      socket.leave(channelId);
    });

    // Handle WebRTC signaling for voice calls (preserved from Phase 1)
    socket.on("voiceSignal", (data) => {
      const { channelId, signal } = data;
      socket.to(channelId).emit("voiceSignal", { signal, fromUserId: userId });
    });

    // WebRTC signaling: initiate call (fully real-time, no DB)
    socket.on("call-user", async (data) => {
      try {
        const { receiverId, callType } = data;
        
        if (receiverId === userId) {
          return socket.emit("call-error", { error: "Cannot call yourself" });
        }

        // Generate unique call ID
        const callId = `call-${Date.now()}-${userId}-${receiverId}`;
        
        // Store in memory
        activeCalls.set(callId, {
          id: callId,
          caller: userId,
          receiver: receiverId,
          type: callType,
          status: 'ringing',
          createdAt: new Date()
        });

        // Get caller info
        const caller = await User.findById(userId).select('name avatar');
        
        // Emit to receiver
        const receiverSockets = onlineUsersManager.getSocketIds(receiverId);
        if (receiverSockets.length > 0) {
          receiverSockets.forEach(socketId => {
            io.to(socketId).emit('incoming-call', {
              callId: callId,
              callerId: userId,
              callerName: caller?.name || 'Unknown',
              callerAvatar: caller?.avatar || null,
              callType: callType
            });
          });
          
          // Confirm to caller
          socket.emit('call-initiated', { callId, status: 'ringing' });
        } else {
          // Receiver offline
          activeCalls.delete(callId);
          socket.emit("call-error", { error: "User is offline" });
        }
      } catch (error) {
        console.error("Error initiating call:", error);
        socket.emit("call-error", { error: error.message });
      }
    });

    // WebRTC signaling: answer call (real-time)
    socket.on("answer-call", (data) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (!call) {
          return socket.emit("call-error", { error: "Call not found" });
        }
        
        if (call.receiver !== userId) {
          return socket.emit("call-error", { error: "Not authorized" });
        }

        // Update call state
        call.status = 'connected';
        call.startTime = new Date();
        activeCalls.set(callId, call);

        // Notify caller
        const callerSockets = onlineUsersManager.getSocketIds(call.caller);
        callerSockets.forEach(socketId => {
          io.to(socketId).emit('call-accepted', {
            callId: callId,
            receiverId: userId
          });
        });
      } catch (error) {
        console.error("Error accepting call:", error);
        socket.emit("call-error", { error: error.message });
      }
    });

    // WebRTC signaling: reject call (real-time)
    socket.on("reject-call", (data) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (!call) return;
        
        if (call.receiver !== userId) {
          return socket.emit("call-error", { error: "Not authorized" });
        }

        // Remove from active calls
        activeCalls.delete(callId);

        // Notify caller
        const callerSockets = onlineUsersManager.getSocketIds(call.caller);
        callerSockets.forEach(socketId => {
          io.to(socketId).emit('call-rejected', {
            callId: callId
          });
        });
      } catch (error) {
        console.error("Error rejecting call:", error);
      }
    });

    // WebRTC signaling: send offer (real-time)
    socket.on("offer", (data) => {
      try {
        const { callId, offer } = data;
        const call = activeCalls.get(callId);
        
        if (!call) return;
        
        const otherUserId = call.caller === userId ? call.receiver : call.caller;
        const otherSockets = onlineUsersManager.getSocketIds(otherUserId);
        
        otherSockets.forEach(socketId => {
          io.to(socketId).emit('offer', {
            callId: callId,
            senderId: userId,
            offer: offer
          });
        });
      } catch (error) {
        console.error("Error sending offer:", error);
      }
    });

    // WebRTC signaling: send answer (real-time)
    socket.on("answer", (data) => {
      try {
        const { callId, answer } = data;
        const call = activeCalls.get(callId);
        
        if (!call) return;
        
        const otherUserId = call.caller === userId ? call.receiver : call.caller;
        const otherSockets = onlineUsersManager.getSocketIds(otherUserId);
        
        otherSockets.forEach(socketId => {
          io.to(socketId).emit('answer', {
            callId: callId,
            senderId: userId,
            answer: answer
          });
        });
      } catch (error) {
        console.error("Error sending answer:", error);
      }
    });

    // WebRTC signaling: send ICE candidate (real-time)
    socket.on("ice-candidate", (data) => {
      try {
        const { callId, candidate } = data;
        const call = activeCalls.get(callId);
        
        if (!call) return;
        
        const otherUserId = call.caller === userId ? call.receiver : call.caller;
        const otherSockets = onlineUsersManager.getSocketIds(otherUserId);
        
        otherSockets.forEach(socketId => {
          io.to(socketId).emit('ice-candidate', {
            callId: callId,
            senderId: userId,
            candidate: candidate
          });
        });
      } catch (error) {
        console.error("Error sending ICE candidate:", error);
      }
    });

    // WebRTC signaling: hangup (real-time)
    socket.on("hangup", (data) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (!call) return;
        
        // Check if user is participant
        if (call.caller !== userId && call.receiver !== userId) {
          return socket.emit("call-error", { error: "Not a participant" });
        }

        const otherUserId = call.caller === userId ? call.receiver : call.caller;
        
        // Remove from active calls
        activeCalls.delete(callId);

        // Notify other participant
        const otherSockets = onlineUsersManager.getSocketIds(otherUserId);
        otherSockets.forEach(socketId => {
          io.to(socketId).emit('call-ended', {
            callId: callId,
            endedBy: userId
          });
        });
      } catch (error) {
        console.error("Error ending call:", error);
      }
    });

    // Phase 6: Server member events
    socket.on("server-member-request", async (data) => {
      try {
        const { serverId } = data;
        const server = await ServerModel.findById(serverId);
        if (!server) return;
        const isMember = server.members.some(m => m.user.toString() === userId);
        if (!isMember) return;

        const member = await ServerMember.findOne({ server: serverId, user: userId });
        const user = await User.findById(userId).select('-password');
        socket.emit('server-member-initialized', {
          serverId,
          member: {
            id: user._id,
            name: user.name,
            displayName: user.displayName,
            avatar: user.avatar,
            nickname: member ? member.nickname : null,
            roles: member ? member.roles : [],
            joinedAt: member ? member.joinedAt : null
          }
        });
      } catch (error) {
        console.error("Error initializing server member:", error);
      }
    });

    socket.on("update-nickname", async (data) => {
      try {
        const { serverId, nickname } = data;
        const server = await ServerModel.findById(serverId);
        if (!server) return;

        let member = await ServerMember.findOne({ server: serverId, user: userId });
        if (member) {
          member.nickname = nickname?.trim() || null;
          await member.save();
        } else {
          member = await ServerMember.create({
            user: userId,
            server: serverId,
            nickname: nickname?.trim() || null
          });
        }

        socket.join(userId.toString());
        io.to(userId.toString()).emit('nickname-updated', {
          serverId,
          userId,
          nickname: member.nickname
        });
      } catch (error) {
        console.error("Error updating nickname:", error);
      }
    });

    socket.on("request-server-members", async (data) => {
      try {
        const { serverId, page, limit } = data;
        const server = await ServerModel.findById(serverId);
        if (!server) return;

        const memberIds = server.members.map(m => m.user);
        const users = await User.find({ _id: { $in: memberIds } }).select('-password');

        const serverMembers = await ServerMember.find({
          server: serverId,
          user: { $in: memberIds }
        });

        const smMap = {};
        serverMembers.forEach(sm => { smMap[sm.user.toString()] = sm; });

        const members = users.map(user => {
          const sm = smMap[user._id.toString()];
          return {
            id: user._id,
            name: user.name,
            displayName: user.displayName,
            avatar: user.avatar,
            nickname: sm ? sm.nickname : null,
            role: server.members.find(m => m.user.toString() === user._id.toString())?.role || 'member',
            joinedAt: server.members.find(m => m.user.toString() === user._id.toString())?.joinedAt,
            lastSeen: sm ? sm.lastSeen : null
          };
        });

        socket.emit('server-members-list', { serverId, members });
      } catch (error) {
        console.error("Error requesting server members:", error);
      }
    });

    // Phase 7: Media sharing events
    socket.on("attachment-uploaded", async (data) => {
      try {
        const { messageId, attachmentId } = data;
        const userId = socket.user.id;

        const message = await Message.findById(messageId);
        if (!message) return;

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(p => p.toString() === userId);
        if (!isParticipant) return;

        const attachment = await Attachment.findById(attachmentId);
        if (!attachment) return;

        attachment.message = messageId;
        await attachment.save();

        if (!message.attachments) message.attachments = [];
        message.attachments.push(attachmentId);

        const fileType = attachment.mimeType.startsWith('image/') ? 'IMAGE' :
          attachment.mimeType.startsWith('video/') ? 'VIDEO' :
          attachment.mimeType.startsWith('audio/') ? 'VOICE' : 'FILE';
        message.type = fileType;

        await message.save();

        io.to(conversation._id.toString()).emit("attachment-uploaded", {
          messageId,
          attachment: {
            id: attachment._id,
            fileName: attachment.fileName,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            url: storageService.getFileUrl(attachment.fileName),
            thumbnail: attachment.thumbnail
          }
        });
      } catch (error) {
        console.error("Error handling attachment upload:", error);
      }
    });

    socket.on("reaction-added", async (data) => {
      try {
        const { messageId, emoji } = data;
        const userId = socket.user.id;

        const message = await Message.findById(messageId);
        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          r => r.emoji === emoji && r.userId.toString() === userId
        );

        if (existingIndex >= 0) {
          message.reactions.splice(existingIndex, 1);
        } else {
          message.reactions.push({ userId, emoji });
        }

        await message.save();

        const conversation = await Conversation.findById(message.conversationId);
        if (conversation) {
          io.to(conversation._id.toString()).emit("reaction-updated", {
            messageId,
            emoji,
            userId,
            action: existingIndex >= 0 ? 'removed' : 'added'
          });
        }
      } catch (error) {
        console.error("Error handling reaction:", error);
      }
    });

    socket.on("voice-uploaded", async (data) => {
      try {
        const { messageId, attachmentId, duration } = data;
        const userId = socket.user.id;

        const attachment = await Attachment.findById(attachmentId);
        if (attachment) {
          attachment.message = messageId;
          attachment.duration = duration;
          await attachment.save();
        }

        const message = await Message.findById(messageId);
        if (message) {
          message.type = 'VOICE';
          if (!message.attachments) message.attachments = [];
          message.attachments.push(attachmentId);
          await message.save();
        }

        const conversation = await Conversation.findById(message.conversationId);
        if (conversation) {
          io.to(conversation._id.toString()).emit("voice-uploaded", {
            messageId,
            attachmentId,
            duration
          });
        }
      } catch (error) {
        console.error("Error handling voice upload:", error);
      }
    });

    socket.on("sticker-sent", async (data) => {
      try {
        const { messageId, stickerId } = data;
        const userId = socket.user.id;

        const message = await Message.findById(messageId);
        if (!message) return;

        message.type = 'STICKER';
        message.sticker = stickerId;
        await message.save();

        const sticker = await Sticker.findById(stickerId);
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation) {
          io.to(conversation._id.toString()).emit("sticker-sent", {
            messageId,
            sticker: sticker ? {
              id: sticker._id,
              name: sticker.name,
              imageUrl: sticker.imageUrl,
              type: sticker.type,
              isAnimated: sticker.isAnimated
            } : null
          });
        }
      } catch (error) {
        console.error("Error handling sticker:", error);
      }
    });
  });
