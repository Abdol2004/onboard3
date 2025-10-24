const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Get Settings Page
exports.getSettingsPage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }

    res.render('settings', { 
      title: 'Settings',
      user: user.toObject()
    });

  } catch (error) {
    console.error("Settings page error:", error);
    res.status(500).send("Error loading settings");
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { bio, twitter, github, telegram } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Update profile fields
    user.bio = bio || '';
    user.twitter = twitter || '';
    user.github = github || '';
    user.telegram = telegram || '';

    // Add activity
    if (!user.recentActivity) {
      user.recentActivity = [];
    }

    user.recentActivity.unshift({
      action: 'Updated profile information',
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully!" 
    });

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Update Password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Current password is incorrect" 
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be at least 6 characters" 
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;

    // Add activity
    if (!user.recentActivity) {
      user.recentActivity = [];
    }

    user.recentActivity.unshift({
      action: 'Changed account password 🔒',
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Password updated successfully!" 
    });

  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Update Notifications
exports.updateNotifications = async (req, res) => {
  try {
    const { notifications } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Initialize notifications object if it doesn't exist
    if (!user.notifications) {
      user.notifications = {};
    }

    // Update notification preferences
    user.notifications = {
      newQuests: notifications.newQuests || false,
      newBounties: notifications.newBounties || false,
      eventReminders: notifications.eventReminders || false,
      weeklyDigest: notifications.weeklyDigest || false,
      submissionUpdates: notifications.submissionUpdates || false
    };

    // Add activity
    if (!user.recentActivity) {
      user.recentActivity = [];
    }

    user.recentActivity.unshift({
      action: 'Updated notification preferences',
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Notification preferences updated!" 
    });

  } catch (error) {
    console.error("Update notifications error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Update Privacy
exports.updatePrivacy = async (req, res) => {
  try {
    const { privacy } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Initialize privacy object if it doesn't exist
    if (!user.privacy) {
      user.privacy = {};
    }

    // Update privacy settings
    user.privacy = {
      showOnLeaderboard: privacy.showOnLeaderboard !== false,
      publicProfile: privacy.publicProfile !== false
    };

    // Add activity
    if (!user.recentActivity) {
      user.recentActivity = [];
    }

    user.recentActivity.unshift({
      action: 'Updated privacy settings',
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Privacy settings updated!" 
    });

  } catch (error) {
    console.error("Update privacy error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Update Wallet
exports.updateWallet = async (req, res) => {
  try {
    const { walletAddress, action } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (action === 'connect') {
      // Validate wallet address (basic validation)
      if (!walletAddress || walletAddress.length < 40) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid wallet address" 
        });
      }

      user.walletAddress = walletAddress;

      // Add activity
      if (!user.recentActivity) {
        user.recentActivity = [];
      }

      user.recentActivity.unshift({
        action: 'Connected wallet address 💰',
        timestamp: new Date()
      });

      if (user.recentActivity.length > 10) {
        user.recentActivity = user.recentActivity.slice(0, 10);
      }

      await user.save();

      res.status(200).json({ 
        success: true, 
        message: "Wallet connected successfully!" 
      });

    } else if (action === 'disconnect') {
      user.walletAddress = null;

      // Add activity
      if (!user.recentActivity) {
        user.recentActivity = [];
      }

      user.recentActivity.unshift({
        action: 'Disconnected wallet address',
        timestamp: new Date()
      });

      if (user.recentActivity.length > 10) {
        user.recentActivity = user.recentActivity.slice(0, 10);
      }

      await user.save();

      res.status(200).json({ 
        success: true, 
        message: "Wallet disconnected successfully!" 
      });

    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action" 
      });
    }

  } catch (error) {
    console.error("Update wallet error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};