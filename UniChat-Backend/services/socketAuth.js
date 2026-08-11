const jwt = require('jsonwebtoken');
const User = require('../models/User');

function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.error('[SocketAuth] No token provided');
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = {
      id: decoded.id,
      username: decoded.username,
    };

    console.log(`[SocketAuth] User authenticated: ${decoded.id}`);
    next();
  } catch (error) {
    console.error('[SocketAuth] Invalid token:', error.message);
    next(new Error('Invalid token'));
  }
}

module.exports = socketAuth;