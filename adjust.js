require('dotenv').config();
const mongoose = require('mongoose');
const UserQuestProgress = require('./models/UserQuestProgress');
const User = require('./models/User');

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ==================== CONFIGURATION ====================
const CONFIG = {
  questId: 'YOUR_QUEST_ID_HERE', // Replace with actual quest ID
  
  // Mode: 'increase', 'decrease', 'set', or 'randomize'
  mode: 'increase',
  
  // For 'increase' or 'decrease' mode
  xpChange: 500,
  
  // For 'set' mode (set specific XP for user)
  targetUserId: null, // Set user ID here
  newXpValue: 3000,
  
  // For 'randomize' mode
  randomRange: {
    min: 1000,
    max: 3000
  },
  
  // Filter options
  filter: {
    onlyFakeUsers: false, // true = only affect fake users, false = affect all
    onlyRealUsers: false, // true = only affect real users
    specificUserIds: [], // Array of user IDs to target (leave empty for all)
    topN: null, // Only affect top N users (null for all)
    bottomN: null // Only affect bottom N users (null for all)
  }
};

// ==================== ADJUST XP ====================
async function adjustLeaderboardXP() {
  try {
    console.log('🎯 Starting XP adjustment...');
    console.log(`📊 Quest ID: ${CONFIG.questId}`);
    console.log(`⚙️  Mode: ${CONFIG.mode}`);

    // Build query based on filters
    let query = {
      questId: CONFIG.questId,
      status: 'completed'
    };

    // Apply user type filters
    if (CONFIG.filter.specificUserIds.length > 0) {
      query.userId = { $in: CONFIG.filter.specificUserIds };
    }

    // Get all completed progress entries
    let progressEntries = await UserQuestProgress.find(query)
      .populate('userId')
      .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 });

    console.log(`📊 Found ${progressEntries.length} completed entries`);

    // Apply fake/real user filters
    if (CONFIG.filter.onlyFakeUsers) {
      progressEntries = progressEntries.filter(p => p.userId.isFakeUser === true);
      console.log(`🎭 Filtering to fake users only: ${progressEntries.length} entries`);
    }

    if (CONFIG.filter.onlyRealUsers) {
      progressEntries = progressEntries.filter(p => !p.userId.isFakeUser);
      console.log(`👤 Filtering to real users only: ${progressEntries.length} entries`);
    }

    // Apply top/bottom filters
    if (CONFIG.filter.topN) {
      progressEntries = progressEntries.slice(0, CONFIG.filter.topN);
      console.log(`🔝 Filtering to top ${CONFIG.filter.topN}: ${progressEntries.length} entries`);
    }

    if (CONFIG.filter.bottomN) {
      progressEntries = progressEntries.slice(-CONFIG.filter.bottomN);
      console.log(`⬇️  Filtering to bottom ${CONFIG.filter.bottomN}: ${progressEntries.length} entries`);
    }

    if (progressEntries.length === 0) {
      console.log('⚠️  No entries found matching filters!');
      return;
    }

    console.log(`\n🔄 Adjusting XP for ${progressEntries.length} users...\n`);

    let updatedCount = 0;

    for (const progress of progressEntries) {
      const user = progress.userId;
      const oldXp = progress.xpBreakdown.totalXp;
      const oldUserXp = user.xp;
      let newXp = oldXp;

      // Calculate new XP based on mode
      switch (CONFIG.mode) {
        case 'increase':
          newXp = oldXp + CONFIG.xpChange;
          break;
        
        case 'decrease':
          newXp = Math.max(0, oldXp - CONFIG.xpChange);
          break;
        
        case 'set':
          if (CONFIG.targetUserId && user._id.toString() === CONFIG.targetUserId) {
            newXp = CONFIG.newXpValue;
          } else {
            continue; // Skip users not matching targetUserId
          }
          break;
        
        case 'randomize':
          newXp = Math.floor(Math.random() * (CONFIG.randomRange.max - CONFIG.randomRange.min + 1)) + CONFIG.randomRange.min;
          break;
        
        default:
          console.error('❌ Invalid mode!');
          return;
      }

      const xpDifference = newXp - oldXp;

      // Update quest progress XP breakdown
      const ratio = newXp / oldXp;
      progress.xpBreakdown.taskXp = Math.floor(progress.xpBreakdown.taskXp * ratio);
      progress.xpBreakdown.baseXp = Math.floor(progress.xpBreakdown.baseXp * ratio);
      progress.xpBreakdown.totalXp = newXp;

      await progress.save();

      // Update user's global XP
      user.xp = Math.max(0, oldUserXp + xpDifference);
      await user.save();

      updatedCount++;

      const changeSymbol = xpDifference >= 0 ? '+' : '';
      console.log(`${updatedCount}. ${user.username} | ${oldXp} → ${newXp} XP (${changeSymbol}${xpDifference})`);
    }

    console.log('\n🎉 XP adjustment complete!');
    console.log(`📊 Total users updated: ${updatedCount}`);
    
    // Show updated leaderboard
    console.log('\n🏆 Updated Leaderboard (Top 10):');
    const updatedLeaderboard = await UserQuestProgress.find({
      questId: CONFIG.questId,
      status: 'completed'
    })
    .populate('userId', 'username')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 })
    .limit(10);

    updatedLeaderboard.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.userId.username} - ${entry.xpBreakdown.totalXp} XP`);
    });

  } catch (error) {
    console.error('❌ Error adjusting XP:', error);
  }
}

// ==================== BOOST SPECIFIC USER ====================
async function boostSpecificUser(userId, xpBoost) {
  try {
    console.log(`🚀 Boosting user: ${userId} by ${xpBoost} XP`);

    const progress = await UserQuestProgress.findOne({
      userId: userId,
      questId: CONFIG.questId,
      status: 'completed'
    });

    if (!progress) {
      console.log('❌ User progress not found!');
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    const oldXp = progress.xpBreakdown.totalXp;
    const newXp = oldXp + xpBoost;

    progress.xpBreakdown.baseXp += xpBoost;
    progress.xpBreakdown.totalXp = newXp;
    await progress.save();

    user.xp += xpBoost;
    await user.save();

    console.log(`✅ ${user.username}: ${oldXp} → ${newXp} XP (+${xpBoost})`);

  } catch (error) {
    console.error('❌ Error boosting user:', error);
  }
}

// ==================== RESET ALL XP TO FAIR VALUES ====================
async function resetToFairCompetition() {
  try {
    console.log('🔄 Resetting to fair competition...');

    // Remove all fake users
    const fakeUsers = await User.find({ isFakeUser: true });
    const fakeUserIds = fakeUsers.map(user => user._id);

    await UserQuestProgress.deleteMany({
      userId: { $in: fakeUserIds },
      questId: CONFIG.questId
    });

    await User.deleteMany({ isFakeUser: true });

    console.log(`✅ Removed ${fakeUsers.length} fake users`);
    console.log('🎉 Leaderboard reset to real users only!');

    // Show real leaderboard
    const realLeaderboard = await UserQuestProgress.find({
      questId: CONFIG.questId,
      status: 'completed'
    })
    .populate('userId', 'username')
    .sort({ 'xpBreakdown.totalXp': -1, completedAt: 1 });

    console.log('\n🏆 Real Leaderboard:');
    realLeaderboard.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.userId.username} - ${entry.xpBreakdown.totalXp} XP`);
    });

  } catch (error) {
    console.error('❌ Error resetting:', error);
  }
}

// ==================== EXECUTE ====================
const args = process.argv.slice(2);
const command = args[0];

async function run() {
  await connectDB();
  
  if (command === 'boost') {
    const userId = args[1];
    const xpBoost = parseInt(args[2]);
    
    if (!userId || !xpBoost) {
      console.log('❌ Usage: node adjust-leaderboard-xp.js boost <userId> <xpAmount>');
      process.exit(1);
    }
    
    await boostSpecificUser(userId, xpBoost);
  } else if (command === 'reset') {
    await resetToFairCompetition();
  } else {
    await adjustLeaderboardXP();
  }
  
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
}

run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// ==================== USAGE EXAMPLES ====================
/*
 * ADJUST ALL USERS:
 * 1. Update CONFIG with questId and desired mode
 * 2. Run: node adjust-leaderboard-xp.js
 * 
 * BOOST SPECIFIC USER:
 * Run: node adjust-leaderboard-xp.js boost <userId> <xpAmount>
 * Example: node adjust-leaderboard-xp.js boost 507f1f77bcf86cd799439011 1000
 * 
 * RESET TO REAL USERS ONLY:
 * Run: node adjust-leaderboard-xp.js reset
 * 
 * MODES:
 * - increase: Add XP to all users
 * - decrease: Subtract XP from all users
 * - set: Set specific XP for a target user
 * - randomize: Randomize XP within a range
 * 
 * FILTERS:
 * - onlyFakeUsers: Only affect injected fake users
 * - onlyRealUsers: Only affect real users
 * - topN: Only affect top N users on leaderboard
 * - bottomN: Only affect bottom N users
 */