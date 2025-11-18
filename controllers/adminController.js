// controllers/adminController.js
const User = require("../models/User");
const Quest = require("../models/Quest");
const Event = require("../models/Event");
const CourseApplication = require("../models/CourseApplication");
const UserQuestProgress = require("../models/UserQuestProgress");
const emailService = require("../utils/emailService");

const Transaction = require("../models/Transaction");


// ==================== DASHBOARD ====================

// Get Admin Dashboard Page
exports.getAdminDashboard = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.redirect('/dashboard');
    }

    res.render('admin/dashboard', { 
      title: 'Admin Dashboard',
      user: user.toObject()
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).send("Error loading admin dashboard");
  }
};

// ==================== STATISTICS ====================

// Get Overall Statistics
exports.getStatistics = async (req, res) => {
  try {
    console.log('📊 Fetching statistics...');

    const totalUsers = await User.countDocuments();
    const activeQuests = await Quest.countDocuments({ isActive: true });
    const now = new Date();
    const upcomingEvents = await Event.countDocuments({
      startDate: { $gte: now },
      status: { $in: ['upcoming', 'ongoing'] }
    });
    const pendingApplications = await CourseApplication.countDocuments({ status: 'pending' });

    // Calculate total XP and USDC distributed
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalXP: { $sum: '$xp' },
          totalUSDC: { $sum: '$usdcBalance' }
        }
      }
    ]);

    const stats = {
      totalUsers,
      activeQuests,
      upcomingEvents,
      pendingApplications,
      totalXP: userStats[0]?.totalXP || 0,
      totalUSDC: userStats[0]?.totalUSDC || 0
    };

    console.log('✅ Statistics:', stats);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("❌ Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
};

// ==================== USERS MANAGEMENT ====================

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    console.log('👥 Fetching users...');
    
    const { search, status, page = 1, limit = 50 } = req.query;

    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'unverified') {
      query.isVerified = false;
    }

    const users = await User.find(query)
      .select('-password -verificationToken')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    console.log(`✅ Found ${users.length} users`);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};

// Get User Count
exports.getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments();
    console.log(`👥 Total users: ${count}`);
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error("❌ Get user count error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user count",
      error: error.message
    });
  }
};

// Get Single User Details
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user's quest progress
    const questProgress = await UserQuestProgress.find({ userId })
      .populate('questId', 'title xpReward')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's event registrations
    const events = await Event.find({ 'registrations.user': userId })
      .select('title startDate eventType')
      .sort({ startDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      user,
      questProgress,
      events
    });

  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user details"
    });
  }
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { xp, usdcBalance, profession, isVerified } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update allowed fields
    if (xp !== undefined) user.xp = xp;
    if (usdcBalance !== undefined) user.usdcBalance = usdcBalance;
    if (profession !== undefined) user.profession = profession;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user
    });

  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user"
    });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Clean up user's data
    await UserQuestProgress.deleteMany({ userId });
    await Event.updateMany(
      { 'registrations.user': userId },
      { $pull: { registrations: { user: userId } } }
    );

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user"
    });
  }
};

// Export Users CSV
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('username email xp usdcBalance createdAt isVerified')
      .sort({ createdAt: -1 });

    // Create CSV
    let csv = 'Username,Email,XP,USDC Balance,Verified,Join Date\n';
    users.forEach(user => {
      csv += `${user.username},${user.email},${user.xp},${user.usdcBalance},${user.isVerified ? 'Yes' : 'No'},${new Date(user.createdAt).toLocaleDateString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);

  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting users"
    });
  }
};

// ==================== QUESTS MANAGEMENT ====================

// Get All Quests (Admin)
exports.getAllQuests = async (req, res) => {
  try {
    console.log('🎯 Fetching quests...');
    
    const { search, status, category } = req.query;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (category) {
      query.category = category;
    }

    const quests = await Quest.find(query)
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${quests.length} quests`);

    res.status(200).json({
      success: true,
      quests
    });

  } catch (error) {
    console.error("❌ Get quests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quests",
      error: error.message
    });
  }
};

// Get Quest Statistics
exports.getQuestStats = async (req, res) => {
  try {
    const active = await Quest.countDocuments({ isActive: true });
    const inactive = await Quest.countDocuments({ isActive: false });
    const total = await Quest.countDocuments();

    console.log(`🎯 Quest stats - Active: ${active}, Inactive: ${inactive}`);

    res.status(200).json({
      success: true,
      active,
      inactive,
      total
    });

  } catch (error) {
    console.error("❌ Get quest stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quest statistics",
      error: error.message
    });
  }
};
exports.createQuest = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      difficulty,
      questType, // 'standard', 'referral_boost', 'fcfs', 'competition'
      baseXpReward,
      usdcReward,
      badgeReward,
      estimatedDuration,
      tasks,
      dailyTasks,
      resources,
      startDate,
      endDate,
      maxParticipants,
      // Referral config
      referralEnabled,
      xpPerReferralJoin,
      xpPerReferralComplete,
      // Competition config
      competitionEnabled,
      topWinnersCount,
      winnerBonusXP
    } = req.body;

    console.log('🎯 Creating quest with data:', req.body);

    // Validation
    if (!title || !description || !shortDescription) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and short description are required"
      });
    }

    // Format tasks with XP rewards
    const formattedTasks = Array.isArray(tasks)
      ? tasks.map((task, index) => {
          if (typeof task === "string") {
            return {
              title: task,
              description: task,
              order: index + 1,
              taskType: "submission",
              xpReward: 0, // Admin can set this
              isDaily: false
            };
          }

          return {
            title: task.title || task.description || `Task ${index + 1}`,
            description: task.description || task.title || "",
            order: index + 1,
            taskType: task.taskType || "submission",
            xpReward: task.xpReward || 0, // XP per task
            isDaily: false,
            inputLabel: task.inputLabel || null,
            inputName: task.inputName || null,
            buttonText: task.buttonText || null,
            buttonLink: task.buttonLink || null,
            requirements: task.requirements || {},
            validationUrl: task.validationUrl || null
          };
        })
      : [];

    // Format daily tasks (if any)
    const formattedDailyTasks = Array.isArray(dailyTasks)
      ? dailyTasks.map((task, index) => ({
          title: task.title,
          description: task.description,
          order: formattedTasks.length + index + 1,
          taskType: task.taskType || "submission",
          xpReward: task.xpReward || 0,
          isDaily: true,
          inputLabel: task.inputLabel || null,
          inputName: task.inputName || null,
          buttonText: task.buttonText || null,
          buttonLink: task.buttonLink || null
        }))
      : [];

    console.log('📋 Formatted tasks:', formattedTasks);
    console.log('📅 Formatted daily tasks:', formattedDailyTasks);

    const quest = new Quest({
      title,
      description,
      shortDescription,
      category: category || 'learning',
      difficulty: difficulty || 'beginner',
      questType: questType || 'standard',
      
      // Rewards
      baseXpReward: baseXpReward || 0,
      usdcReward: usdcReward || 0,
      badgeReward: badgeReward || null,
      
      estimatedDuration: estimatedDuration || "1-2 hours",
      tasks: formattedTasks,
      dailyTasks: formattedDailyTasks,
      resources: resources || [],
      
      // Dates
      startDate: startDate || null,
      endDate: endDate || null,
      maxParticipants: maxParticipants || null,
      
      // Referral config
      referralConfig: {
        enabled: referralEnabled || false,
        xpPerReferralJoin: xpPerReferralJoin || 0,
        xpPerReferralComplete: xpPerReferralComplete || 0
      },
      
      // Competition config
      competitionConfig: {
        enabled: competitionEnabled || false,
        topWinnersCount: topWinnersCount || 10,
        winnerBonusXP: winnerBonusXP || 0
      },
      
      createdBy: req.session.userId,
      isActive: true
    });

    await quest.save();

    console.log('✅ Quest created successfully:', quest._id);

    res.status(201).json({
      success: true,
      message: "Quest created successfully",
      quest
    });

  } catch (error) {
    console.error("❌ Create quest error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating quest",
      error: error.message
    });
  }
};

// ==================== ADD DAILY TASK TO QUEST ====================

exports.addDailyTask = async (req, res) => {
  try {
    const { questId } = req.params;
    const { title, description, taskType, xpReward, inputLabel, inputName, buttonText, buttonLink } = req.body;

    const quest = await Quest.findById(questId);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    const newTask = {
      title,
      description,
      order: quest.tasks.length + quest.dailyTasks.length + 1,
      taskType: taskType || 'submission',
      xpReward: xpReward || 0,
      isDaily: true,
      inputLabel: inputLabel || null,
      inputName: inputName || null,
      buttonText: buttonText || null,
      buttonLink: buttonLink || null
    };

    quest.dailyTasks.push(newTask);
    await quest.save();

    // Update all active user progress to include this new task
    await UserQuestProgress.updateMany(
      { questId: questId, status: { $in: ['not_started', 'in_progress'] } },
      {
        $push: {
          taskProgress: {
            taskId: newTask._id,
            isCompleted: false
          }
        },
        $inc: { totalTasks: 1 }
      }
    );

    res.status(200).json({
      success: true,
      message: "Daily task added successfully",
      task: newTask
    });

  } catch (error) {
    console.error("Add daily task error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding daily task"
    });
  }
};

// ==================== REMOVE DAILY TASK ====================

exports.removeDailyTask = async (req, res) => {
  try {
    const { questId, taskId } = req.params;

    const quest = await Quest.findById(questId);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    // Remove from daily tasks
    quest.dailyTasks = quest.dailyTasks.filter(t => t._id.toString() !== taskId);
    await quest.save();

    // Remove from user progress
    await UserQuestProgress.updateMany(
      { questId: questId },
      {
        $pull: {
          taskProgress: { taskId: taskId }
        },
        $inc: { totalTasks: -1 }
      }
    );

    res.status(200).json({
      success: true,
      message: "Daily task removed successfully"
    });

  } catch (error) {
    console.error("Remove daily task error:", error);
    res.status(500).json({
      success: false,
      message: "Error removing daily task"
    });
  }
};

// ==================== GET QUEST LEADERBOARD (ADMIN VIEW) ====================

exports.getQuestLeaderboardAdmin = async (req, res) => {
  try {
    const { questId } = req.params;

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    const leaderboard = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    })
    .populate('userId', 'username email')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 })
    .limit(100);

    const leaderboardData = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.userId?.username || 'Unknown',
      email: entry.userId?.email || '',
      totalXp: entry.xpBreakdown.totalXp,
      taskXp: entry.xpBreakdown.taskXp,
      baseXp: entry.xpBreakdown.baseXp,
      referralJoinBonus: entry.xpBreakdown.referralJoinBonus,
      referralCompleteBonus: entry.xpBreakdown.referralCompleteBonus,
      winnerBonus: entry.xpBreakdown.winnerBonus,
      completedAt: entry.completedAt,
      timeSpent: entry.timeSpentMinutes,
      isWinner: entry.isWinner,
      referralsJoined: entry.referralStats.referralsJoined.length,
      referralsCompleted: entry.referralStats.referralsCompleted.length
    }));

    res.status(200).json({
      success: true,
      quest: {
        title: quest.title,
        questType: quest.questType,
        startDate: quest.startDate,
        endDate: quest.endDate
      },
      leaderboard: leaderboardData,
      totalParticipants: quest.totalParticipants,
      totalCompletions: quest.totalCompletions
    });

  } catch (error) {
    console.error("Get quest leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaderboard"
    });
  }
};

// ==================== UPDATE QUEST SETTINGS ====================

exports.updateQuestSettings = async (req, res) => {
  try {
    const { questId } = req.params;
    const {
      baseXpReward,
      usdcReward,
      referralEnabled,
      xpPerReferralJoin,
      xpPerReferralComplete,
      competitionEnabled,
      topWinnersCount,
      winnerBonusXP,
      startDate,
      endDate,
      maxParticipants
    } = req.body;

    const quest = await Quest.findById(questId);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    // Update rewards
    if (baseXpReward !== undefined) quest.baseXpReward = baseXpReward;
    if (usdcReward !== undefined) quest.usdcReward = usdcReward;

    // Update referral config
    if (referralEnabled !== undefined) quest.referralConfig.enabled = referralEnabled;
    if (xpPerReferralJoin !== undefined) quest.referralConfig.xpPerReferralJoin = xpPerReferralJoin;
    if (xpPerReferralComplete !== undefined) quest.referralConfig.xpPerReferralComplete = xpPerReferralComplete;

    // Update competition config
    if (competitionEnabled !== undefined) quest.competitionConfig.enabled = competitionEnabled;
    if (topWinnersCount !== undefined) quest.competitionConfig.topWinnersCount = topWinnersCount;
    if (winnerBonusXP !== undefined) quest.competitionConfig.winnerBonusXP = winnerBonusXP;

    // Update dates
    if (startDate !== undefined) quest.startDate = startDate;
    if (endDate !== undefined) quest.endDate = endDate;
    if (maxParticipants !== undefined) quest.maxParticipants = maxParticipants;

    quest.updatedAt = Date.now();
    await quest.save();

    res.status(200).json({
      success: true,
      message: "Quest settings updated successfully",
      quest
    });

  } catch (error) {
    console.error("Update quest settings error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quest settings"
    });
  }
};

// ==================== EXPORT QUEST LEADERBOARD CSV ====================

exports.exportQuestLeaderboard = async (req, res) => {
  try {
    const { questId } = req.params;

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    const leaderboard = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    })
    .populate('userId', 'username email')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 });

    // Create CSV
    let csv = 'Rank,Username,Email,Total XP,Task XP,Base XP,Referral Join Bonus,Referral Complete Bonus,Winner Bonus,Referrals Joined,Referrals Completed,Completion Time (min),Completed At\n';
    
    leaderboard.forEach((entry, index) => {
      csv += `${index + 1},${entry.userId?.username || 'Unknown'},${entry.userId?.email || ''},${entry.xpBreakdown.totalXp},${entry.xpBreakdown.taskXp},${entry.xpBreakdown.baseXp},${entry.xpBreakdown.referralJoinBonus},${entry.xpBreakdown.referralCompleteBonus},${entry.xpBreakdown.winnerBonus},${entry.referralStats.referralsJoined.length},${entry.referralStats.referralsCompleted.length},${entry.timeSpentMinutes},${new Date(entry.completedAt).toLocaleString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${quest.title.replace(/\s+/g, '_')}_leaderboard.csv`);
    res.send(csv);

  } catch (error) {
    console.error("Export leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting leaderboard"
    });
  }
};

// Delete Quest
exports.deleteQuest = async (req, res) => {
  try {
    const { questId } = req.params;

    const quest = await Quest.findByIdAndDelete(questId);

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    // Delete associated progress records
    await UserQuestProgress.deleteMany({ questId });

    res.status(200).json({
      success: true,
      message: "Quest deleted successfully"
    });

  } catch (error) {
    console.error("Delete quest error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting quest"
    });
  }
};
// Toggle Quest Status (Active/Inactive)
exports.toggleQuestStatus = async (req, res) => {
  try {
    const { questId } = req.params;
    const { isActive } = req.body;

    const quest = await Quest.findById(questId);

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    quest.isActive = isActive;
    quest.updatedAt = Date.now();
    await quest.save();

    res.status(200).json({
      success: true,
      message: `Quest ${isActive ? 'activated' : 'deactivated'} successfully`,
      quest
    });

  } catch (error) {
    console.error("Toggle quest status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quest status"
    });
  }
};

// ==================== ADD THESE TO YOUR adminController.js ====================

// Get Quest Winners for Reward Distribution
exports.getQuestWinners = async (req, res) => {
  try {
    const { questId, topCount } = req.query;

    if (!questId) {
      return res.status(400).json({
        success: false,
        message: "Quest ID is required"
      });
    }

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    const count = parseInt(topCount) || 10;

    // Get top performers
    const winners = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    })
    .populate('userId', 'username email walletAddress usdcBalance')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 })
    .limit(count);

    const winnersData = winners.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId._id,
      username: entry.userId.username,
      email: entry.userId.email,
      walletAddress: entry.userId.walletAddress,
      currentBalance: entry.userId.usdcBalance,
      totalXp: entry.xpBreakdown.totalXp,
      completedAt: entry.completedAt,
      suggestedReward: calculateReward(index + 1, count)
    }));

    res.status(200).json({
      success: true,
      quest: {
        id: quest._id,
        title: quest.title
      },
      winners: winnersData
    });

  } catch (error) {
    console.error("Get quest winners error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quest winners"
    });
  }
};

// Helper function to calculate suggested rewards
function calculateReward(rank, totalWinners) {
  if (totalWinners <= 10) {
    const rewards = [100, 75, 50, 40, 30, 25, 20, 15, 10, 5];
    return rewards[rank - 1] || 5;
  } else if (totalWinners <= 50) {
    if (rank === 1) return 100;
    if (rank <= 3) return 50;
    if (rank <= 10) return 25;
    if (rank <= 25) return 10;
    return 5;
  } else {
    if (rank === 1) return 200;
    if (rank <= 5) return 100;
    if (rank <= 20) return 50;
    if (rank <= 50) return 20;
    return 10;
  }
}

exports.getAllEvents = async (req, res) => {
  try {
    console.log('📅 [ADMIN] Fetching all events...');
    
    const events = await Event.find({})
      .sort({ startDate: -1 })
      .lean(); // Use lean() for better performance

    console.log(`✅ [ADMIN] Found ${events.length} events`);

    res.status(200).json({
      success: true,
      events
    });

  } catch (error) {
    console.error("❌ [ADMIN] Get all events error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching events: " + error.message,
      error: error.message
    });
  }
};

// Get Event Statistics  
exports.getEventStats = async (req, res) => {
  try {
    const now = new Date();
    
    const upcoming = await Event.countDocuments({
      startDate: { $gte: now }
    });

    const completed = await Event.countDocuments({ 
      endDate: { $lt: now }
    });
    
    const total = await Event.countDocuments();

    console.log(`📅 Event stats - Upcoming: ${upcoming}, Completed: ${completed}`);

    res.status(200).json({
      success: true,
      upcoming,
      completed,
      total
    });

  } catch (error) {
    console.error("❌ Get event stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event statistics",
      error: error.message
    });
  }
};

// Create Event
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      category,
      venue,
      virtualLink,
      startDate,
      endDate,
      startTime,
      endTime,
      timezone,
      prizePool
    } = req.body;

    console.log('📅 Creating event:', { title, eventType, venue, virtualLink });

    if (!title || !description || !eventType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    if ((eventType === 'physical' || eventType === 'hybrid') && (!venue || venue.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Venue is required for physical and hybrid events"
      });
    }

    if ((eventType === 'virtual' || eventType === 'hybrid') && (!virtualLink || virtualLink.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Virtual link is required for virtual and hybrid events"
      });
    }

    const eventData = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      category: category || 'other',
      startDate: start,
      endDate: end,
      startTime: startTime || '10:00',
      endTime: endTime || '17:00',
      timezone: timezone || 'WAT',
      status: 'upcoming',
      createdBy: req.session.userId
    };

    if (venue && venue.trim()) eventData.venue = venue.trim();
    if (virtualLink && virtualLink.trim()) eventData.virtualLink = virtualLink.trim();
    if (prizePool) eventData.prizePool = prizePool;

    const event = new Event(eventData);
    await event.save();

    console.log('✅ Event created:', event._id);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event
    });

  } catch (error) {
    console.error("❌ Create event error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message
    });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    console.log('✅ Event deleted:', eventId);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting event"
    });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating event"
    });
  }
};

// Get Event Registrations
exports.getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('registrations.user', 'username email xp');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      registrations: event.registrations,
      total: event.totalRegistrations,
      checkedIn: event.registrations.filter(r => r.checkedIn).length
    });

  } catch (error) {
    console.error("Get registrations error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations"
    });
  }
};

// Get Application Details
exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await CourseApplication.findById(applicationId)
      .populate('user', 'username email xp');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.status(200).json({
      success: true,
      application
    });

  } catch (error) {
    console.error("Get application details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching application details",
      error: error.message
    });
  }
};
// ==================== REPLACE YOUR EXISTING createEvent METHOD WITH THIS ====================

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      category,
      venue,
      virtualLink,
      startDate,
      endDate,
      startTime,
      endTime,
      timezone,
      prizePool
    } = req.body;

    console.log('📅 Creating event with data:', {
      title,
      description,
      eventType,
      venue: venue || 'not provided',
      virtualLink: virtualLink || 'not provided'
    });

    // Validation
    if (!title || !description || !eventType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    // Type-specific validation
    if ((eventType === 'physical' || eventType === 'hybrid')) {
      if (!venue || venue.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Venue is required for physical and hybrid events"
        });
      }
    }

    if ((eventType === 'virtual' || eventType === 'hybrid')) {
      if (!virtualLink || virtualLink.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Virtual link is required for virtual and hybrid events"
        });
      }
    }

    // Build event data
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      category: category || 'other',
      startDate: start,
      endDate: end,
      startTime: startTime || '10:00',
      endTime: endTime || '17:00',
      timezone: timezone || 'WAT',
      status: 'upcoming',
      createdBy: req.session.userId
    };

    if (venue && venue.trim()) {
      eventData.venue = venue.trim();
    }
    
    if (virtualLink && virtualLink.trim()) {
      eventData.virtualLink = virtualLink.trim();
    }

    if (prizePool) {
      eventData.prizePool = prizePool;
    }

    console.log('💾 Saving event...');

    const event = new Event(eventData);
    await event.save();

    console.log('✅ Event created:', event._id);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event
    });

  } catch (error) {
    console.error("❌ Create event error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message
    });
  }
};



// ==================== GET APPLICATION DETAILS ====================
// Add this with your other application functions

exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await CourseApplication.findById(applicationId)
      .populate('user', 'username email xp');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.status(200).json({
      success: true,
      application
    });

  } catch (error) {
    console.error("Get application details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching application details",
      error: error.message
    });
  }
};
// Get Event Statistics
exports.getEventStats = async (req, res) => {
  try {
    const now = new Date();
    
    const upcoming = await Event.countDocuments({
      startDate: { $gte: now }
    });

    const completed = await Event.countDocuments({ 
      endDate: { $lt: now }
    });
    
    const total = await Event.countDocuments();

    console.log(`📅 Event stats - Upcoming: ${upcoming}, Completed: ${completed}`);

    res.status(200).json({
      success: true,
      upcoming,
      completed,
      total
    });

  } catch (error) {
    console.error("❌ Get event stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event statistics",
      error: error.message
    });
  }
};
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      category,
      venue,
      virtualLink,
      startDate,
      endDate,
      startTime,
      endTime,
      timezone,
      prizePool,
      maxRegistrations
    } = req.body;

    console.log('📅 Creating event with data:', req.body);

    // Validation
    if (!title || !description || !eventType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing: title, description, eventType, startDate, endDate"
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    // Validate venue/virtualLink based on eventType
    if (eventType === 'physical' || eventType === 'hybrid') {
      if (!venue || venue.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Venue is required for physical and hybrid events"
        });
      }
    }

    if (eventType === 'virtual' || eventType === 'hybrid') {
      if (!virtualLink || virtualLink.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Virtual link is required for virtual and hybrid events"
        });
      }
    }

    // Create event object with proper null handling
    const eventData = {
      title,
      description,
      eventType,
      category: category || 'other',
      startDate: start,
      endDate: end,
      startTime: startTime || '10:00',
      endTime: endTime || '17:00',
      timezone: timezone || 'WAT',
      prizePool: prizePool || null,
      maxRegistrations: maxRegistrations || null,
      status: 'upcoming',
      createdBy: req.session.userId
    };

    // Only add venue if it's physical or hybrid
    if (eventType === 'physical' || eventType === 'hybrid') {
      eventData.venue = venue;
    }

    // Only add virtualLink if it's virtual or hybrid
    if (eventType === 'virtual' || eventType === 'hybrid') {
      eventData.virtualLink = virtualLink;
    }

    const event = new Event(eventData);

    await event.save();

    console.log('✅ Event created successfully:', event._id);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event
    });

  } catch (error) {
    console.error("❌ Create event error:", error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error: " + messages.join(', '),
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message,
      details: error.stack
    });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating event"
    });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting event"
    });
  }
};

// Get Event Registrations
exports.getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('registrations.user', 'username email xp');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      registrations: event.registrations,
      total: event.totalRegistrations,
      checkedIn: event.registrations.filter(r => r.checkedIn).length
    });

  } catch (error) {
    console.error("Get registrations error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations"
    });
  }
};

// ==================== APPLICATIONS MANAGEMENT ====================

// Get All Applications (Admin)
exports.getAllApplications = async (req, res) => {
  try {
    console.log('📝 Fetching applications...');
    
    const { status, course, search } = req.query;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (course) {
      query.course = course;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const applications = await CourseApplication.find(query)
      .populate('user', 'username email')
      .sort({ appliedAt: -1 });

    console.log(`✅ Found ${applications.length} applications`);

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error("❌ Get applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message
    });
  }
};

// Get Application Statistics
exports.getApplicationStats = async (req, res) => {
  try {
    const pending = await CourseApplication.countDocuments({ status: 'pending' });
    const approved = await CourseApplication.countDocuments({ status: 'approved' });
    const rejected = await CourseApplication.countDocuments({ status: 'rejected' });
    const total = await CourseApplication.countDocuments();

    console.log(`📝 Application stats - Pending: ${pending}, Approved: ${approved}, Rejected: ${rejected}`);

    res.status(200).json({
      success: true,
      pending,
      approved,
      rejected,
      total
    });

  } catch (error) {
    console.error("❌ Get application stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching application statistics",
      error: error.message
    });
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { courseStartDate, courseEndDate, courseLink, notes } = req.body;

    console.log('📝 Approving application:', applicationId);

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Approve the application
    await application.approve(req.session.userId, notes, {
      startDate: courseStartDate,
      endDate: courseEndDate,
      link: courseLink
    });

    // Send approval email
    try {
      const emailResult = await emailService.sendCourseApprovalEmail(
        application.email,
        application.fullName,
        application.course,
        {
          startDate: courseStartDate,
          endDate: courseEndDate,
          link: courseLink
        }
      );

      if (emailResult.success) {
        console.log('✅ Approval email sent successfully');
      } else {
        console.error('⚠️ Failed to send approval email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Email error (non-blocking):', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: "Application approved successfully",
      application
    });

  } catch (error) {
    console.error("❌ Approve application error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving application",
      error: error.message
    });
  }
};

// ==================== FIX: Reject Application with Email ====================
exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { notes } = req.body;

    console.log('📝 Rejecting application:', applicationId);

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Reject the application
    await application.reject(req.session.userId, notes);

    // Send rejection email
    try {
      const emailResult = await emailService.sendCourseRejectionEmail(
        application.email,
        application.fullName,
        application.course,
        notes
      );

      if (emailResult.success) {
        console.log('✅ Rejection email sent successfully');
      } else {
        console.error('⚠️ Failed to send rejection email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Email error (non-blocking):', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: "Application rejected",
      application
    });

  } catch (error) {
    console.error("❌ Reject application error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting application",
      error: error.message
    });
  }
};


// Reject Application (Admin)
exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { notes } = req.body;

    console.log('📝 Rejecting application:', applicationId);

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Reject the application
    await application.reject(req.session.userId, notes);

    // Send rejection email
    try {
      const emailResult = await emailService.sendCourseRejectionEmail(
        application.email,
        application.fullName,
        application.course,
        notes
      );

      if (emailResult.success) {
        console.log('✅ Rejection email sent successfully');
      } else {
        console.error('⚠️ Failed to send rejection email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Email error (non-blocking):', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: "Application rejected",
      application
    });

  } catch (error) {
    console.error("❌ Reject application error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting application",
      error: error.message
    });
  }
};

// Export Applications CSV
exports.exportApplications = async (req, res) => {
  try {
    const applications = await CourseApplication.find()
      .sort({ appliedAt: -1 });

    // Create CSV
    let csv = 'Name,Email,Course,Twitter,Status,Applied Date\n';
    applications.forEach(app => {
      csv += `${app.fullName},${app.email},${app.course},${app.twitterHandle || 'N/A'},${app.status},${new Date(app.appliedAt).toLocaleDateString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
    res.send(csv);

  } catch (error) {
    console.error("Export applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting applications"
    });
  }
};


// ==================== QUEST REWARD DISTRIBUTION ====================

// Get Quest Winners for Reward Distribution
exports.getQuestWinners = async (req, res) => {
  try {
      const { questId } = req.params;  // <-- Make sure this is extracting from params, not query
      const { topCount } = req.query;
       console.log('📊 getQuestWinners called');
    console.log('Request params:', req.params);
    console.log('Quest ID:', questId);

    if (!questId) {
      return res.status(400).json({
        success: false,
        message: "Quest ID is required"
      });
    }

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    const count = parseInt(topCount) || 10;

    // Get top performers
    const winners = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    })
    .populate('userId', 'username email walletAddress usdcBalance')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 })
    .limit(count);

    const winnersData = winners.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId._id,
      username: entry.userId.username,
      email: entry.userId.email,
      walletAddress: entry.userId.walletAddress,
      currentBalance: entry.userId.usdcBalance,
      totalXp: entry.xpBreakdown.totalXp,
      completedAt: entry.completedAt,
      // Default reward amount (can be edited by admin)
      suggestedReward: calculateReward(index + 1, count)
    }));

    res.status(200).json({
      success: true,
      quest: {
        id: quest._id,
        title: quest.title
      },
      winners: winnersData
    });

  } catch (error) {
    console.error("Get quest winners error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quest winners"
    });
  }
};

// Helper function to calculate suggested rewards
function calculateReward(rank, totalWinners) {
  // Example reward structure - customize as needed
  if (totalWinners <= 10) {
    const rewards = [100, 75, 50, 40, 30, 25, 20, 15, 10, 5];
    return rewards[rank - 1] || 5;
  } else if (totalWinners <= 50) {
    if (rank === 1) return 100;
    if (rank <= 3) return 50;
    if (rank <= 10) return 25;
    if (rank <= 25) return 10;
    return 5;
  } else {
    if (rank === 1) return 200;
    if (rank <= 5) return 100;
    if (rank <= 20) return 50;
    if (rank <= 50) return 20;
    return 10;
  }
}

function openRewardDistributionFromLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const questId = modal.getAttribute('data-quest-id');
    closeLeaderboardModal();
    openRewardDistribution(questId);
}




// Distribute Rewards to Quest Winners
exports.distributeQuestRewards = async (req, res) => {
  try {
    const { questId, rewards } = req.body;

    if (!questId || !rewards || !Array.isArray(rewards)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data"
      });
    }

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    const results = [];
    let totalDistributed = 0;

    // Process each reward
    for (const reward of rewards) {
      try {
        const { userId, amount } = reward;
        
        if (!userId || !amount || amount <= 0) {
          results.push({
            userId,
            success: false,
            message: "Invalid amount"
          });
          continue;
        }

        const user = await User.findById(userId);
        if (!user) {
          results.push({
            userId,
            success: false,
            message: "User not found"
          });
          continue;
        }

        // Add USDC to user balance
        user.usdcBalance += parseFloat(amount);

        // Create transaction record
        const transaction = new Transaction({
          user: user._id,
          type: 'quest_reward',
          amount: parseFloat(amount),
          status: 'completed',
          questId: quest._id,
          questTitle: quest.title,
          description: `Quest reward for completing: ${quest.title}`,
          processedBy: req.session.userId,
          processedAt: new Date(),
          createdAt: new Date()
        });

        await transaction.save();

        // Add activity to user
        user.recentActivity.unshift({
          action: `Received $${amount} USDC reward from quest: ${quest.title}`,
          timestamp: new Date()
        });

        if (user.recentActivity.length > 10) {
          user.recentActivity = user.recentActivity.slice(0, 10);
        }

        await user.save();

        // 👇 SEND EMAIL NOTIFICATION
        try {
          await emailService.sendQuestRewardEmail(
            user.email,
            user.username,
            amount,
            quest.title
          );
          console.log(`📧 Reward email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`⚠️ Failed to send email to ${user.email}:`, emailError.message);
          // Don't fail the whole process if email fails
        }

        totalDistributed += parseFloat(amount);

        results.push({
          userId,
          username: user.username,
          success: true,
          amount: parseFloat(amount),
          transactionId: transaction._id,
          emailSent: true
        });

        console.log(`✅ Distributed $${amount} to ${user.username}`);

      } catch (error) {
        console.error(`Error processing reward for user ${reward.userId}:`, error);
        results.push({
          userId: reward.userId,
          success: false,
          message: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Distributed $${totalDistributed.toFixed(2)} to ${results.filter(r => r.success).length} users. Emails sent!`,
      totalDistributed,
      results
    });

  } catch (error) {
    console.error("Distribute quest rewards error:", error);
    res.status(500).json({
      success: false,
      message: "Error distributing rewards: " + error.message
    });
  }
};

// ==================== WITHDRAWAL MANAGEMENT ====================

// Get All Withdrawal Requests
exports.getAllWithdrawals = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    let query = { type: 'withdrawal' };
    if (status !== 'all') {
      query.status = status;
    }

    const withdrawals = await Transaction.find(query)
      .populate('user', 'username email walletAddress')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      withdrawals
    });

  } catch (error) {
    console.error("Get withdrawals error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawals"
    });
  }
};

// Get Withdrawal Statistics
exports.getWithdrawalStats = async (req, res) => {
  try {
    const pending = await Transaction.countDocuments({
      type: 'withdrawal',
      status: 'pending'
    });

    const completed = await Transaction.countDocuments({
      type: 'withdrawal',
      status: 'completed'
    });

    const rejected = await Transaction.countDocuments({
      type: 'withdrawal',
      status: 'rejected'
    });

    // Total amounts
    const stats = await Transaction.aggregate([
      { $match: { type: 'withdrawal' } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      pending,
      completed,
      rejected,
      stats
    });

  } catch (error) {
    console.error("Get withdrawal stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawal statistics"
    });
  }
};

// Approve Withdrawal
exports.approveWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { txHash, notes } = req.body;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      type: 'withdrawal',
      status: 'pending'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Pending withdrawal not found"
      });
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update transaction
    transaction.status = 'completed';
    transaction.processedBy = req.session.userId;
    transaction.processedAt = new Date();
    transaction.txHash = txHash || null;
    transaction.notes = notes || null;

    await transaction.save();

    // Add activity to user
    user.recentActivity.unshift({
      action: `Withdrawal of $${transaction.amount} approved and processed`,
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal approved successfully"
    });

  } catch (error) {
    console.error("Approve withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving withdrawal"
    });
  }
};

// Reject Withdrawal
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { notes } = req.body;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      type: 'withdrawal',
      status: 'pending'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Pending withdrawal not found"
      });
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Restore balance to user
    user.usdcBalance += transaction.amount;

    // Update transaction
    transaction.status = 'rejected';
    transaction.processedBy = req.session.userId;
    transaction.processedAt = new Date();
    transaction.notes = notes || 'Withdrawal rejected by admin';

    await transaction.save();

    // Add activity to user
    user.recentActivity.unshift({
      action: `Withdrawal of $${transaction.amount} was rejected. Balance restored.`,
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal rejected and balance restored"
    });

  } catch (error) {
    console.error("Reject withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting withdrawal"
    });
  }
};