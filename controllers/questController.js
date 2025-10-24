const Quest = require("../models/Quest");
const UserQuestProgress = require("../models/UserQuestProgress");
const User = require("../models/User");

// Get all quests (active and inactive for user)
exports.getAllQuests = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }
    
    // Get all active quests
    const allQuests = await Quest.find({ isActive: true }).sort({ createdAt: -1 });
    
    // Get user's progress for all quests
    const userProgress = await UserQuestProgress.find({ 
      userId: req.session.userId 
    });

    // Create a map of quest progress
    const progressMap = {};
    userProgress.forEach(progress => {
      progressMap[progress.questId.toString()] = progress;
    });

    // Categorize quests
    const activeQuests = [];
    const availableQuests = [];

    allQuests.forEach(quest => {
      const progress = progressMap[quest._id.toString()];
      
      const questData = {
        ...quest.toObject(),
        userProgress: progress ? progress.toObject() : null
      };

      if (progress && progress.status === 'in_progress') {
        activeQuests.push(questData);
      } else if (!progress || progress.status === 'not_started') {
        availableQuests.push(questData);
      }
    });

    res.render('dashboard/quest', { 
      title: 'Quests',
      user: user.toObject(),
      activeQuests: activeQuests || [],
      availableQuests: availableQuests || [],
      completedCount: userProgress.filter(p => p.status === 'completed').length
    });

  } catch (error) {
    console.error("Get quests error:", error);
    res.status(500).send("Error loading quests");
  }
};

// Get quest details with user progress
exports.getQuestDetails = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const { questId } = req.params;
    const user = await User.findById(req.session.userId).select('-password');
    
    // Get quest details
    const quest = await Quest.findById(questId);
    
    if (!quest) {
      return res.status(404).send("Quest not found");
    }

    // Get or create user progress
    let userProgress = await UserQuestProgress.findOne({
      userId: req.session.userId,
      questId: questId
    });

    if (!userProgress) {
      // Create initial progress record
      userProgress = new UserQuestProgress({
        userId: req.session.userId,
        questId: questId,
        totalTasks: quest.tasks.length,
        taskProgress: quest.tasks.map(task => ({
          taskId: task._id,
          isCompleted: false
        }))
      });
      await userProgress.save();
    }

    // Get leaderboard for this quest
    const leaderboard = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    })
    .populate('userId', 'username')
    .sort({ completedAt: 1 })
    .limit(10);

    res.render('dashboard/quest-details', { 
      title: quest.title,
      user: user.toObject(),
      quest: quest.toObject(),
      userProgress: userProgress.toObject(),
      leaderboard: leaderboard.map(item => item.toObject())
    });

  } catch (error) {
    console.error("Get quest details error:", error);
    res.status(500).send("Error loading quest details");
  }
};

// Start a quest
exports.startQuest = async (req, res) => {
  try {
    const { questId } = req.body;

    const quest = await Quest.findById(questId);
    
    if (!quest) {
      return res.status(404).json({ 
        success: false, 
        message: "Quest not found" 
      });
    }

    // Check if user already has progress
    let userProgress = await UserQuestProgress.findOne({
      userId: req.session.userId,
      questId: questId
    });

    if (userProgress && userProgress.status === 'in_progress') {
      return res.status(400).json({ 
        success: false, 
        message: "Quest already in progress" 
      });
    }

    if (userProgress && userProgress.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: "Quest already completed" 
      });
    }

    if (!userProgress) {
      userProgress = new UserQuestProgress({
        userId: req.session.userId,
        questId: questId,
        totalTasks: quest.tasks.length,
        taskProgress: quest.tasks.map(task => ({
          taskId: task._id,
          isCompleted: false
        }))
      });
    }

    userProgress.status = 'in_progress';
    userProgress.startedAt = new Date();
    await userProgress.save();

    // Update quest stats
    quest.totalAttempts += 1;
    await quest.save();

    // Add activity to user
    const user = await User.findById(req.session.userId);
    user.recentActivity.unshift({
      action: `Started quest: ${quest.title}`,
      timestamp: new Date()
    });
    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Quest started successfully",
      questId: questId
    });

  } catch (error) {
    console.error("Start quest error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Submit task completion
exports.submitTask = async (req, res) => {
  try {
    const { questId, taskId, submissionUrl, submissionText, submissionData } = req.body;

    const userProgress = await UserQuestProgress.findOne({
      userId: req.session.userId,
      questId: questId
    });

    if (!userProgress) {
      return res.status(404).json({ 
        success: false, 
        message: "Quest progress not found" 
      });
    }

    // Find the task in progress
    const taskProgress = userProgress.taskProgress.find(
      tp => tp.taskId.toString() === taskId
    );

    if (!taskProgress) {
      return res.status(404).json({ 
        success: false, 
        message: "Task not found" 
      });
    }

    if (taskProgress.isCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: "Task already completed" 
      });
    }

    // Update task progress
    taskProgress.isCompleted = true;
    taskProgress.completedAt = new Date();
    taskProgress.submissionUrl = submissionUrl;
    taskProgress.submissionText = submissionText;
    taskProgress.submissionData = submissionData;

    // Update overall progress
    userProgress.tasksCompleted += 1;
    userProgress.progress = Math.round((userProgress.tasksCompleted / userProgress.totalTasks) * 100);

    // Add activity for task completion (not quest completion yet)
    const quest = await Quest.findById(questId);
    const user = await User.findById(req.session.userId);
    
    user.recentActivity.unshift({
      action: `Completed task: ${quest.tasks.find(t => t._id.toString() === taskId).title}`,
      timestamp: new Date()
    });

    // Check if quest is completed
    if (userProgress.tasksCompleted === userProgress.totalTasks) {
      userProgress.status = 'completed';
      userProgress.completedAt = new Date();
      
      // Calculate time spent
      if (userProgress.startedAt) {
        userProgress.timeSpentMinutes = Math.round(
          (userProgress.completedAt - userProgress.startedAt) / 60000
        );
      }

      // NOW give rewards (only on full quest completion)
      userProgress.xpEarned = quest.xpReward;
      userProgress.usdcEarned = quest.usdcReward;
      userProgress.badgeEarned = quest.badgeReward;

      // Update user stats with rewards
      user.xp += quest.xpReward;
      user.usdcBalance += quest.usdcReward;
      
      user.recentActivity.unshift({
        action: `🎉 Completed quest: ${quest.title} (+${quest.xpReward} XP${quest.usdcReward > 0 ? ', +' + quest.usdcReward + ' USDC' : ''})`,
        timestamp: new Date()
      });

      // Update quest stats
      quest.totalCompletions += 1;
      
      // Update average completion time
      const completedQuests = await UserQuestProgress.find({
        questId: questId,
        status: 'completed',
        timeSpentMinutes: { $gt: 0 }
      });
      
      if (completedQuests.length > 0) {
        const totalTime = completedQuests.reduce((sum, q) => sum + q.timeSpentMinutes, 0);
        quest.averageCompletionTime = Math.round(totalTime / completedQuests.length);
      } else {
        quest.averageCompletionTime = 0;
      }
      
      await quest.save();
    }
    
    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }
    
    await user.save();

    await userProgress.save();

    res.status(200).json({ 
      success: true, 
      message: userProgress.status === 'completed' ? "Quest completed! 🎉" : "Task submitted successfully",
      progress: userProgress.progress,
      isQuestCompleted: userProgress.status === 'completed',
      rewards: userProgress.status === 'completed' ? {
        xp: userProgress.xpEarned,
        usdc: userProgress.usdcEarned,
        badge: userProgress.badgeEarned
      } : null
    });

  } catch (error) {
    console.error("Submit task error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Get quest leaderboard
exports.getQuestLeaderboard = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');

    // Get all users with completed quests
    const userStats = await User.aggregate([
      {
        $lookup: {
          from: 'userquestprogresses',
          localField: '_id',
          foreignField: 'userId',
          as: 'questProgress'
        }
      },
      {
        $addFields: {
          completedQuests: {
            $size: {
              $filter: {
                input: '$questProgress',
                as: 'progress',
                cond: { $eq: ['$$progress.status', 'completed'] }
              }
            }
          },
          totalXP: '$xp'
        }
      },
      {
        $match: {
          isVerified: true,
          completedQuests: { $gt: 0 }
        }
      },
      {
        $sort: { completedQuests: -1, totalXP: -1 }
      },
      {
        $project: {
          username: 1,
          xp: 1,
          completedQuests: 1,
          createdAt: 1
        }
      }
    ]);

    // Find current user's rank
    const userRank = userStats.findIndex(
      u => u._id.toString() === req.session.userId
    ) + 1;

    res.render('dashboard/quest-leaderboard', { 
      title: 'Quest Leaderboard',
      user: user.toObject(),
      leaderboard: userStats,
      userRank: userRank || null
    });

  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).send("Error loading leaderboard");
  }
};
