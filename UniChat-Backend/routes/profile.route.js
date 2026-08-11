const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const authMiddleware = require('../middlewares/auth');

// All routes require authentication
router.use(authMiddleware);

// Complete user profile
router.post('/profile/complete', profileController.completeProfile);

// Get user profile
router.get('/profile', profileController.getProfile);

// Update user profile
router.put('/profile', profileController.updateProfile);

module.exports = router;