/**
 * OnlineUsersManager
 * 
 * Manages online user presence using ObjectId-based lookups.
 * Supports multiple browser tabs via Set<socketId> per user.
 * Emits events when users go online/offline.
 * 
 * Structure: Map<userId (string), Set<socketId>>
 */
class OnlineUsersManager {
  constructor() {
    this._users = new Map();
    this._io = null;
  }

  /**
   * Bind the Socket.IO server instance for broadcasting.
   */
  setIO(io) {
    this._io = io;
  }

  /**
   * Add a socket connection for a user.
   * Returns true if user was not previously online.
   */
  add(userId, socketId) {
    const userIdStr = userId.toString();
    
    if (!this._users.has(userIdStr)) {
      this._users.set(userIdStr, new Set());
    }

    const sockets = this._users.get(userIdStr);
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);

    console.log(`[OnlineUsers] User ${userIdStr} connected (${sockets.size} tabs)`);

    // Broadcast presence update if user just came online
    if (wasOffline && this._io) {
      this._broadcastPresence(userIdStr, true);
    }

    return wasOffline;
  }

  /**
   * Remove a socket connection for a user.
   * Returns true if user is now fully offline.
   */
  remove(socketId) {
    for (const [userIdStr, sockets] of this._users.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        
        if (sockets.size === 0) {
          this._users.delete(userIdStr);
          console.log(`[OnlineUsers] User ${userIdStr} fully disconnected`);
          
          if (this._io) {
            this._broadcastPresence(userIdStr, false);
          }
          return true;
        }
        
        console.log(`[OnlineUsers] User ${userIdStr} tab closed (${sockets.size} remaining)`);
        return false;
      }
    }
    return false;
  }

  /**
   * Check if a user is online.
   */
  isOnline(userId) {
    const sockets = this._users.get(userId.toString());
    return sockets && sockets.size > 0;
  }

  /**
   * Get all socket IDs for a user.
   */
  getSocketIds(userId) {
    const sockets = this._users.get(userId.toString());
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Get all online user IDs.
   */
  getOnlineUserIds() {
    return Array.from(this._users.keys());
  }

  /**
   * Get the count of online users.
   */
  getOnlineCount() {
    return this._users.size;
  }

  /**
   * Broadcast presence update to all connected clients.
   */
  _broadcastPresence(userId, isOnline) {
    if (this._io) {
      this._io.emit('presence-update', {
        userId: userId,
        online: isOnline
      });
    }
  }
}

// Singleton instance
const onlineUsersManager = new OnlineUsersManager();

module.exports = onlineUsersManager;