const Quest = require("../models/Quest");
const UserQuestProgress = require("../models/UserQuestProgress");
const User = require("../models/User");

// ==================== QUEST LISTING ====================
exports.getAllQuests = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }
    
    // Get ALL active quests (simplified query)
    const allQuests = await Quest.find({ 
      isActive: true
    }).sort({ createdAt: -1 });
    
    console.log('📋 Total active quests found:', allQuests.length);
    
    // Debug each quest
    allQuests.forEach(quest => {
      console.log(`\n🔍 Quest: "${quest.title}"`);
      console.log(`   - Start Date: ${quest.startDate}`);
      console.log(`   - End Date: ${quest.endDate}`);
      console.log(`   - Is Active: ${quest.isActive}`);
    });
    
    // Get user's progress for all quests
    const userProgress = await UserQuestProgress.find({ 
      userId: req.session.userId 
    });

    console.log('📊 User progress records:', userProgress.length);

    // Create a map of quest progress
    const progressMap = {};
    userProgress.forEach(progress => {
      progressMap[progress.questId.toString()] = progress;
    });

    // Categorize quests
    const activeQuests = [];
    const availableQuests = [];
    const completedQuests = [];

    allQuests.forEach(quest => {
      const now = new Date();
      
      console.log(`\n⏰ Checking quest: "${quest.title}"`);
      console.log(`   Current time: ${now}`);
      console.log(`   Start Date check: ${!quest.startDate} || ${quest.startDate} <= ${now} = ${!quest.startDate || quest.startDate <= now}`);
      console.log(`   End Date check: ${!quest.endDate} || ${quest.endDate} >= ${now} = ${!quest.endDate || quest.endDate >= now}`);
      
      // Check if quest is currently active based on dates
      const isAvailableNow = (!quest.startDate || quest.startDate <= now) && 
                             (!quest.endDate || quest.endDate >= now);
      
      console.log(`   ✓ Is Available Now: ${isAvailableNow}`);
      
      if (!isAvailableNow) {
        console.log(`   ❌ Quest skipped - not available`);
        return; // Skip this quest
      }

      const progress = progressMap[quest._id.toString()];
      
      const questData = {
        ...quest.toObject(),
        userProgress: progress ? progress.toObject() : null
      };

      if (progress && progress.status === 'completed') {
        completedQuests.push(questData);
        console.log(`   ✅ Added to COMPLETED`);
      } else if (progress && progress.status === 'in_progress') {
        activeQuests.push(questData);
        console.log(`   🔥 Added to ACTIVE`);
      } else {
        availableQuests.push(questData);
        console.log(`   ✨ Added to AVAILABLE`);
      }
    });

    console.log('\n📊 FINAL COUNTS:');
    console.log('✅ Available:', availableQuests.length);
    console.log('🔥 Active:', activeQuests.length);
    console.log('✔️ Completed:', completedQuests.length);

    res.render('dashboard/quest', { 
      title: 'Quests',
      user: user.toObject(),
      activeQuests: activeQuests || [],
      availableQuests: availableQuests || [],
      completedQuests: completedQuests || [],
      completedCount: completedQuests.length
    });

  } catch (error) {
    console.error("❌ Get quests error:", error);
    res.status(500).send("Error loading quests");
  }
};

// ==================== QUEST DETAILS ====================
exports.getQuestDetails = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const { questId } = req.params;
    const user = await User.findById(req.session.userId).select('-password');
    
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
      // Combine regular tasks + daily tasks
      const allTasks = [...quest.tasks, ...(quest.dailyTasks || [])];
      
      userProgress = new UserQuestProgress({
        userId: req.session.userId,
        questId: questId,
        totalTasks: allTasks.length,
        taskProgress: allTasks.map(task => ({
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
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 })
    .limit(100);

    // Find user's rank
    const userRank = leaderboard.findIndex(
      entry => entry.userId._id.toString() === req.session.userId
    ) + 1;

    res.render('dashboard/quest-details', { 
      title: quest.title,
      user: user.toObject(),
      quest: quest.toObject(),
      userProgress: userProgress.toObject(),
      leaderboard: leaderboard.map(item => item.toObject()),
      userRank: userRank || null
    });

  } catch (error) {
    console.error("Get quest details error:", error);
    res.status(500).send("Error loading quest details");
  }
};

// ==================== START QUEST ====================
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

    // Check if quest is currently active
    if (!quest.isCurrentlyActive()) {
      return res.status(400).json({
        success: false,
        message: "This quest is not currently available"
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
      const allTasks = [...quest.tasks, ...(quest.dailyTasks || [])];
      
      userProgress = new UserQuestProgress({
        userId: req.session.userId,
        questId: questId,
        totalTasks: allTasks.length,
        taskProgress: allTasks.map(task => ({
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
    quest.totalParticipants += 1;
    await quest.save();

    // ==================== REFERRAL BONUS ====================
    const user = await User.findById(req.session.userId);
    
    if (quest.referralConfig?.enabled && user.referredBy) {
      await processReferralJoinBonus(user.referredBy, user._id, questId, quest.referralConfig.xpPerReferralJoin);
    }

    // Add activity to user
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

// ==================== SUBMIT TASK - FIXED ====================
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

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    // Find the task in quest
    const allTasks = [...quest.tasks, ...(quest.dailyTasks || [])];
    const task = allTasks.find(t => t._id.toString() === taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Find the task in progress
    const taskProgress = userProgress.taskProgress.find(
      tp => tp.taskId.toString() === taskId
    );

    if (!taskProgress) {
      return res.status(404).json({ 
        success: false, 
        message: "Task not found in progress" 
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
    
    // Award XP for this specific task
    const taskXp = task.xpReward || 0;
    taskProgress.xpEarned = taskXp;
    
    // ✅ QUEST-SPECIFIC XP (for leaderboard)
    userProgress.xpBreakdown.taskXp += taskXp;

    // Update overall progress
    userProgress.tasksCompleted += 1;
    userProgress.progress = Math.round((userProgress.tasksCompleted / userProgress.totalTasks) * 100);

    // ✅ GLOBAL XP (for dashboard) - Add task XP immediately
    const user = await User.findById(req.session.userId);
    user.xp += taskXp;
    
    user.recentActivity.unshift({
      action: `Completed task: ${task.title} (+${taskXp} XP)`,
      timestamp: new Date()
    });

    // ==================== CHECK IF QUEST COMPLETED ====================
    if (userProgress.tasksCompleted === userProgress.totalTasks) {
      userProgress.status = 'completed';
      userProgress.completedAt = new Date();
      
      // Calculate time spent
      if (userProgress.startedAt) {
        userProgress.timeSpentMinutes = Math.round(
          (userProgress.completedAt - userProgress.startedAt) / 60000
        );
      }

      // ✅ QUEST-SPECIFIC: Base XP for completing quest
      const baseQuestXp = quest.baseXpReward || 0;
      userProgress.xpBreakdown.baseXp = baseQuestXp;
      userProgress.usdcEarned = quest.usdcReward || 0;
      userProgress.badgeEarned = quest.badgeReward;

      // ✅ GLOBAL XP: Add base quest XP to user's total
      user.xp += baseQuestXp;
      user.usdcBalance += userProgress.usdcEarned;
      
      // Calculate total quest XP for display (taskXp is already added above)
      const totalQuestXp = userProgress.xpBreakdown.taskXp + baseQuestXp;
      
      user.recentActivity.unshift({
        action: `🎉 Completed quest: ${quest.title} (+${totalQuestXp} XP${userProgress.usdcEarned > 0 ? ', +' + userProgress.usdcEarned + ' USDC' : ''})`,
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
      }
      
      await quest.save();

      // ==================== REFERRAL COMPLETION BONUS ====================
      if (quest.referralConfig?.enabled && user.referredBy) {
        await processReferralCompleteBonus(user.referredBy, user._id, questId, quest.referralConfig.xpPerReferralComplete);
      }

      // ==================== FCFS/COMPETITION LOGIC ====================
      if (quest.questType === 'fcfs' || quest.questType === 'competition') {
        await updateQuestLeaderboard(questId, quest);
      }
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
      taskXpEarned: taskXp,
      rewards: userProgress.status === 'completed' ? {
        xp: userProgress.xpBreakdown.totalXp,  // Quest-specific total
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

// ==================== QUEST LEADERBOARD ====================
exports.getQuestLeaderboard = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const { questId } = req.params;
    const user = await User.findById(req.session.userId).select('-password');

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).send("Quest not found");
    }

    // Get leaderboard
    const leaderboard = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    })
    .populate('userId', 'username')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 })
    .limit(100);

    // Find user's rank
    const userRank = leaderboard.findIndex(
      entry => entry.userId._id.toString() === req.session.userId
    ) + 1;

    res.render('dashboard/quest-leaderboard', { 
      title: `${quest.title} - Leaderboard`,
      user: user.toObject(),
      quest: quest.toObject(),
      leaderboard: leaderboard.map(item => item.toObject()),
      userRank: userRank || null
    });

  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).send("Error loading leaderboard");
  }
};

// ==================== HELPER FUNCTIONS - FIXED ====================
async function processReferralJoinBonus(referralCode, referredUserId, questId, xpBonus) {
  try {
    if (xpBonus <= 0) return;

    const referrer = await User.findOne({ referralCode });
    if (!referrer) return;

    let referrerProgress = await UserQuestProgress.findOne({
      userId: referrer._id,
      questId: questId
    });

    if (referrerProgress) {
      // ✅ QUEST-SPECIFIC: Add to quest leaderboard XP
      referrerProgress.referralStats.referralsJoined.push({
        userId: referredUserId,
        joinedAt: new Date(),
        xpEarned: xpBonus
      });

      referrerProgress.calculateReferralXp();
      await referrerProgress.save();

      // ✅ GLOBAL: Add to user's total XP
      referrer.xp += xpBonus;
      referrer.recentActivity.unshift({
        action: `Earned ${xpBonus} XP - Referral joined quest 🎁`,
        timestamp: new Date()
      });

      if (referrer.recentActivity.length > 10) {
        referrer.recentActivity = referrer.recentActivity.slice(0, 10);
      }

      await referrer.save();
    }
  } catch (error) {
    console.error("Process referral join bonus error:", error);
  }
}

async function processReferralCompleteBonus(referralCode, referredUserId, questId, xpBonus) {
  try {
    if (xpBonus <= 0) return;

    const referrer = await User.findOne({ referralCode });
    if (!referrer) return;

    let referrerProgress = await UserQuestProgress.findOne({
      userId: referrer._id,
      questId: questId
    });

    if (referrerProgress) {
      // ✅ QUEST-SPECIFIC: Add to quest leaderboard XP
      referrerProgress.referralStats.referralsCompleted.push({
        userId: referredUserId,
        completedAt: new Date(),
        xpEarned: xpBonus
      });

      referrerProgress.calculateReferralXp();
      await referrerProgress.save();

      // ✅ GLOBAL: Add to user's total XP
      referrer.xp += xpBonus;
      referrer.recentActivity.unshift({
        action: `Earned ${xpBonus} XP - Referral completed quest 🏆`,
        timestamp: new Date()
      });

      if (referrer.recentActivity.length > 10) {
        referrer.recentActivity = referrer.recentActivity.slice(0, 10);
      }

      await referrer.save();
    }
  } catch (error) {
    console.error("Process referral complete bonus error:", error);
  }
}

async function updateQuestLeaderboard(questId, quest) {
  try {
    const topWinners = quest.competitionConfig?.topWinnersCount || 10;
    const winnerBonusXp = quest.competitionConfig?.winnerBonusXP || 0;

    const allCompleted = await UserQuestProgress.find({
      questId: questId,
      status: 'completed'
    }).sort({ completedAt: 1 });

    for (let i = 0; i < allCompleted.length; i++) {
      const progress = allCompleted[i];
      progress.leaderboardRank = i + 1;

      if (i < topWinners) {
        progress.isWinner = true;
        progress.winnerRank = i + 1;

        if (winnerBonusXp > 0 && progress.xpBreakdown.winnerBonus === 0) {
          // ✅ QUEST-SPECIFIC: Add winner bonus to quest XP
          progress.xpBreakdown.winnerBonus = winnerBonusXp;
          
          // ✅ GLOBAL: Add winner bonus to user's total XP
          const user = await User.findById(progress.userId);
          if (user) {
            user.xp += winnerBonusXp;
            user.recentActivity.unshift({
              action: `🥇 Won #${i + 1} in quest! (+${winnerBonusXp} bonus XP)`,
              timestamp: new Date()
            });
            if (user.recentActivity.length > 10) {
              user.recentActivity = user.recentActivity.slice(0, 10);
            }
            await user.save();
          }
        }
      }

      await progress.save();
    }
  } catch (error) {
    console.error("Update leaderboard error:", error);
  }
}