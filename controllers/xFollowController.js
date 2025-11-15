// controllers/xFollowController.js
const User = require("../models/User");
const XFollow = require("../models/XFollow");

// Get X Follow Network Page
exports.getXFollowPage = async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId);
    
    // Get all users with X handles, excluding current user
    const usersWithX = await User.find({
      twitter: { $exists: true, $ne: '' },
      _id: { $ne: req.session.userId }
    }).select('username twitter xp profession createdAt').sort({ createdAt: -1 });

    // Get current user's follow records
    const myFollows = await XFollow.find({ 
      userId: req.session.userId 
    });

    // Get follows where current user is the target
    const followsToMe = await XFollow.find({
      targetUserId: req.session.userId
    });

    // Create a map of follow statuses
    const followMap = {};
    myFollows.forEach(follow => {
      followMap[follow.targetUserId.toString()] = {
        iFollowed: follow.iFollowed,
        theyFollowed: follow.theyFollowed
      };
    });

    followsToMe.forEach(follow => {
      const userId = follow.userId.toString();
      if (!followMap[userId]) {
        followMap[userId] = { iFollowed: false, theyFollowed: false };
      }
      followMap[userId].theyFollowedMe = follow.iFollowed;
    });

    // Get stats
    const totalUsers = usersWithX.length;
    const mutualFollows = myFollows.filter(f => f.iFollowed && f.theyFollowed).length;
    const pendingFollows = myFollows.filter(f => f.iFollowed && !f.theyFollowed).length;

    res.render("dashboard/x-follow", {
      title: "X Follow Network",
      user: currentUser,
      users: usersWithX,
      followMap,
      stats: {
        totalUsers,
        mutualFollows,
        pendingFollows
      }
    });
  } catch (error) {
    console.error("Error loading X Follow Network:", error);
    res.status(500).send("Error loading page");
  }
};

// Update X Handle
exports.updateXHandle = async (req, res) => {
  try {
    const { xHandle } = req.body;
    
    // Remove @ if user added it
    const cleanHandle = xHandle.replace('@', '').trim();
    
    if (!cleanHandle) {
      return res.status(400).json({ 
        success: false, 
        message: "X handle cannot be empty" 
      });
    }

    await User.findByIdAndUpdate(req.session.userId, {
      twitter: cleanHandle
    });

    res.json({ success: true, message: "X handle updated successfully" });
  } catch (error) {
    console.error("Error updating X handle:", error);
    res.status(500).json({ success: false, message: "Error updating handle" });
  }
};

// Mark as Followed
exports.markFollowed = async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ 
        success: false, 
        message: "Target user ID is required" 
      });
    }

    // Find or create follow record
    let follow = await XFollow.findOne({
      userId: req.session.userId,
      targetUserId
    });

    if (follow) {
      follow.iFollowed = true;
      follow.followedAt = new Date();
    } else {
      follow = new XFollow({
        userId: req.session.userId,
        targetUserId,
        iFollowed: true,
        theyFollowed: false,
        followedAt: new Date()
      });
    }

    await follow.save();

    // Check if it's mutual and update the reverse record
    const reverseFollow = await XFollow.findOne({
      userId: targetUserId,
      targetUserId: req.session.userId
    });

    if (reverseFollow && reverseFollow.iFollowed) {
      follow.theyFollowed = true;
      reverseFollow.theyFollowed = true;
      follow.mutualAt = new Date();
      reverseFollow.mutualAt = new Date();
      await follow.save();
      await reverseFollow.save();
    }

    res.json({ 
      success: true, 
      message: "Marked as followed",
      isMutual: follow.iFollowed && follow.theyFollowed
    });
  } catch (error) {
    console.error("Error marking followed:", error);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
};

// Unmark as Followed
exports.unmarkFollowed = async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ 
        success: false, 
        message: "Target user ID is required" 
      });
    }

    const follow = await XFollow.findOne({
      userId: req.session.userId,
      targetUserId
    });

    if (follow) {
      follow.iFollowed = false;
      follow.theyFollowed = false;
      follow.followedAt = null;
      follow.mutualAt = null;
      await follow.save();

      // Update reverse record
      const reverseFollow = await XFollow.findOne({
        userId: targetUserId,
        targetUserId: req.session.userId
      });

      if (reverseFollow) {
        reverseFollow.theyFollowed = false;
        reverseFollow.mutualAt = null;
        await reverseFollow.save();
      }
    }

    res.json({ success: true, message: "Unmarked as followed" });
  } catch (error) {
    console.error("Error unmarking followed:", error);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
};