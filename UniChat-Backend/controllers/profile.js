const User = require('../models/User');

// Complete user profile
exports.completeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, phoneNo, gender, dateOfBirth, bio } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update user profile
    user.displayName = displayName || user.displayName;
    user.phoneNo = phoneNo || user.phoneNo;
    user.gender = gender || user.gender;
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    user.bio = bio || user.bio;
    user.profileComplete = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        phoneNo: user.phoneNo,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        bio: user.bio,
        avatar: user.avatar,
        profileComplete: user.profileComplete
      }
    });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, phoneNo, gender, bio } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update allowed fields
    if (displayName !== undefined) user.displayName = displayName;
    if (phoneNo !== undefined) user.phoneNo = phoneNo;
    if (gender !== undefined) user.gender = gender;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        phoneNo: user.phoneNo,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        bio: user.bio,
        avatar: user.avatar,
        profileComplete: user.profileComplete
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};