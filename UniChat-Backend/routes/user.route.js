const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const authMiddleware = require('../middlewares/auth');

// All routes require authentication
router.use(authMiddleware);

// Search users
router.get('/users/search', userController.searchUsers);

// Send friend request
router.post('/users/friend-request', userController.sendFriendRequest);

// Get friend requests
router.get('/users/friend-requests', userController.getFriendRequests);

// Respond to friend request
router.post('/users/friend-requests/respond', userController.respondToFriendRequest);

// Get friends list
router.get('/users/friends', userController.getFriends);

// Get user profile by ID (must be last to avoid conflicts)
router.get('/users/:userId', userController.getUserProfile);

// Get notifications
router.get('/notifications', userController.getNotifications);

// Mark notification as read
router.put('/notifications/:notificationId/read', userController.markNotificationRead);

// Add announcement
router.post('/announcements', userController.addAnnouncement);

module.exports = router;