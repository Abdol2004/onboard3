const User = require("../models/User");
const { ROLES } = require("../config/gamification");

// Get user's current role
const getUserRole = (xp, joinDate) => {
    const earlyStart = new Date('2024-11-15');
    const earlyEnd = new Date('2024-12-31T23:59:59');
    const userJoinDate = new Date(joinDate);
    const isEarlyCitizen = userJoinDate >= earlyStart && userJoinDate <= earlyEnd;

    // Find role based on XP - check from highest to lowest to ensure correct match
    const roleOrder = ['core_team', 'major', 'legend', 'maxi', 'captain', 'contributor', 'citizen'];
    let currentRole = 'citizen'; // default

    for (const roleKey of roleOrder) {
        const roleData = ROLES[roleKey];
        if (!roleData || roleData.special) continue; // Skip special roles like early_citizen

        if (xp >= roleData.minXP && (roleData.maxXP === Infinity || xp <= roleData.maxXP)) {
            currentRole = roleKey;
            break;
        }
    }

    return {
        currentRole: ROLES[currentRole],
        roleKey: currentRole,
        isEarlyCitizen,
        xp
    };
};

// Get Dashboard
exports.getDashboard = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');

    if (!user) {
      return res.redirect('/auth');
    }

    // Redirect new users to onboarding
    if (!user.onboardingCompleted) {
      return res.redirect('/onboarding');
    }

    // Get total users for ranking
    const totalUsers = await User.countDocuments({ isVerified: true });

    // Get user role data
    const roleData = getUserRole(user.xp || 0, user.createdAt);


    // Add welcome activity if user just logged in
    if (!user.recentActivity) user.recentActivity = [];
    const hasRecentLogin = user.recentActivity.some(
      activity => activity.action.includes('Logged in') &&
      new Date() - new Date(activity.timestamp) < 60000 // Within last minute
    );

    if (!hasRecentLogin) {
      user.recentActivity.unshift({
        action: 'Logged in to dashboard',
        timestamp: new Date()
      });

      // Keep only last 10 activities
      if (user.recentActivity.length > 10) {
        user.recentActivity = user.recentActivity.slice(0, 10);
      }

      await user.save();
    }

    res.render('dashboard', {
      title: 'Dashboard',
      user: user.toObject(),
      totalUsers,
      roleData
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Error loading dashboard");
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (walletAddress) {
      user.walletAddress = walletAddress;

      if (!user.recentActivity) user.recentActivity = [];
      user.recentActivity.unshift({
        action: 'Connected wallet address',
        timestamp: new Date()
      });

      if (user.recentActivity.length > 10) {
        user.recentActivity = user.recentActivity.slice(0, 10);
      }
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully" 
    });

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Add Quest (for testing/demo)
exports.addQuest = async (req, res) => {
  try {
    const { title, xpReward, progress } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!user.activeQuests) user.activeQuests = [];
    user.activeQuests.push({
      title,
      xpReward: parseInt(xpReward) || 50,
      progress: parseInt(progress) || 0
    });

    if (!user.recentActivity) user.recentActivity = [];
    user.recentActivity.unshift({
      action: `Started quest: ${title}`,
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Quest added successfully" 
    });

  } catch (error) {
    console.error("Add quest error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Complete Quest
exports.completeQuest = async (req, res) => {
  try {
    const { questIndex } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (questIndex >= 0 && questIndex < user.activeQuests.length) {
      const quest = user.activeQuests[questIndex];
      const xpEarned = quest.xpReward;

      // Add XP
      user.xp += xpEarned;

      // Remove completed quest
      user.activeQuests.splice(questIndex, 1);

      // Add activity
      if (!user.recentActivity) user.recentActivity = [];
      user.recentActivity.unshift({
        action: `Completed quest: ${quest.title} (+${xpEarned} XP)`,
        timestamp: new Date()
      });

      if (user.recentActivity.length > 10) {
        user.recentActivity = user.recentActivity.slice(0, 10);
      }

      await user.save();

      res.status(200).json({ 
        success: true, 
        message: `Quest completed! +${xpEarned} XP`,
        newXP: user.xp
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Invalid quest" 
      });
    }

  } catch (error) {
    console.error("Complete quest error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};