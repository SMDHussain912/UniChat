const User = require('../models/User');
const Chat = require('../models/Chat');

// Search users by username or name
exports.searchUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Search for users by name or email, excluding current user
    const users = await User.find({
      $and: [
        { _id: { $ne: userId } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { displayName: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('-password').limit(20);

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        profileComplete: user.profileComplete
      }))
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user profile by ID (for viewing other users' profiles)
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        phoneNo: user.phoneNo,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        avatar: user.avatar,
        bio: user.bio,
        profileComplete: user.profileComplete,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if request already exists
    const existingRequest = receiver.friendRequests?.find(
      req => req.sender.toString() === senderId && req.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }

    // Initialize friendRequests array if it doesn't exist
    if (!receiver.friendRequests) {
      receiver.friendRequests = [];
    }

    // Add friend request
    receiver.friendRequests.push({
      sender: senderId,
      status: 'pending',
      createdAt: new Date()
    });

    // Add notification to receiver
    if (!receiver.notifications) {
      receiver.notifications = [];
    }
    
    const sender = await User.findById(senderId);
    receiver.notifications.push({
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${sender.displayName || sender.name} sent you a friend request`,
      read: false,
      createdAt: new Date()
    });

    await receiver.save();

    res.status(200).json({
      success: true,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get friend requests
exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate('friendRequests.sender', 'name displayName avatar bio');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const pendingRequests = user.friendRequests?.filter(req => req.status === 'pending') || [];

    res.status(200).json({
      success: true,
      requests: pendingRequests.map(req => ({
        id: req._id,
        sender: {
          id: req.sender._id,
          name: req.sender.name,
          displayName: req.sender.displayName,
          avatar: req.sender.avatar,
          bio: req.sender.bio
        },
        createdAt: req.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Accept/Reject friend request
exports.respondToFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId, accept } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const requestIndex = user.friendRequests?.findIndex(req => req._id.toString() === requestId);
    
    if (requestIndex === -1 || !user.friendRequests[requestIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    const request = user.friendRequests[requestIndex];
    const senderId = request.sender.toString();

    if (accept) {
      // Add to friends list for both users
      await User.findByIdAndUpdate(userId, {
        $push: { friends: senderId },
        $pull: { friendRequests: { _id: requestId } }
      });

      await User.findByIdAndUpdate(senderId, {
        $push: { friends: userId }
      });

      // Create DM chat between the two users
      const participants = [userId, senderId].sort();
      const existingChat = await Chat.findOne({
        type: 'dm',
        participants: { $all: participants, $size: 2 }
      });

      if (!existingChat) {
        const newChat = new Chat({
          type: 'dm',
          participants: participants,
          messages: []
        });
        await newChat.save();
      }

      res.status(200).json({
        success: true,
        message: 'Friend request accepted',
        chatCreated: true
      });
    } else {
      // Remove the request
      user.friendRequests.splice(requestIndex, 1);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Friend request rejected'
      });
    }
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get friends list
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate('friends', 'name displayName avatar bio');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      friends: user.friends || []
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const notifications = user.notifications || [];

    res.status(200).json({
      success: true,
      notifications: notifications.map(notif => ({
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const notification = user.notifications?.find(n => n._id.toString() === notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.read = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Add announcement (admin function - for now, any user can add)
exports.addAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    const adminId = req.user.id;

    const admin = await User.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all users except admin
    const allUsers = await User.find({ _id: { $ne: adminId } });
    
    // Add notification to all users
    for (const user of allUsers) {
      if (!user.notifications) {
        user.notifications = [];
      }
      user.notifications.push({
        type: 'announcement',
        title: title,
        message: message,
        read: false,
        createdAt: new Date()
      });
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Announcement sent to all users'
    });
  } catch (error) {
    console.error('Error adding announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};