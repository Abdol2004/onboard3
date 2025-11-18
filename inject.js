require('dotenv').config();
const mongoose = require('mongoose');
const UserQuestProgress = require('./models/UserQuestProgress');
const User = require('./models/User');
const Quest = require('./models/Quest');

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = 'mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ==================== CONFIGURATION ====================
const CONFIG = {
  questId: '691accad98869311a99df4ab', // Replace with actual quest ID
  
  // ⭐ CUSTOM USERNAMES - Add your exact names here
  customUsernames: [
    'web3perfect',
    'heemanuel',
    'vibezsolana',
    'cryptokitty',
    'blockchainboss',
  ],
  
  // XP range for each user
  xpRange: {
    min: 420,
    max: 940
  },
  
  // Time spent on quest (3-8 minutes)
  timeRange: {
    minMinutes: 3,
    maxMinutes: 8
  },
  
  // Date configuration - November 17, 2025
  completionDate: {
    year: 2025,
    month: 10, // JavaScript months are 0-indexed (10 = November)
    day: 17
  }
};

// ==================== HELPER FUNCTIONS ====================
const generateRandomXP = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateRandomTime = (minMinutes, maxMinutes) => {
  return Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
};

const generateCompletionTime = () => {
  const { year, month, day } = CONFIG.completionDate;
  
  // Random time between 00:00 and 23:59 on the specified date
  const randomHour = Math.floor(Math.random() * 24);
  const randomMinute = Math.floor(Math.random() * 60);
  const randomSecond = Math.floor(Math.random() * 60);
  
  return new Date(year, month, day, randomHour, randomMinute, randomSecond);
};

// ==================== INJECT CUSTOM USERS ====================
async function injectCustomUsers() {
  try {
    console.log('🚀 Starting custom user injection...');

    // Verify quest exists
    const quest = await Quest.findById(CONFIG.questId);
    if (!quest) {
      console.error('❌ Quest not found! Please check questId in CONFIG');
      return;
    }

    console.log(`✅ Quest found: "${quest.title}"`);
    console.log(`📊 Injecting ${CONFIG.customUsernames.length} custom users...`);
    console.log(`📅 Completion date: ${CONFIG.completionDate.day}/${CONFIG.completionDate.month + 1}/${CONFIG.completionDate.year}`);
    console.log(`⏱️  Time range: ${CONFIG.timeRange.minMinutes}-${CONFIG.timeRange.maxMinutes} minutes\n`);

    const createdUsers = [];

    for (let i = 0; i < CONFIG.customUsernames.length; i++) {
      const username = CONFIG.customUsernames[i];
      const totalXp = generateRandomXP(CONFIG.xpRange.min, CONFIG.xpRange.max);
      const timeSpent = generateRandomTime(CONFIG.timeRange.minMinutes, CONFIG.timeRange.maxMinutes);
      
      // Distribute XP between task and base
      const taskXp = Math.floor(totalXp * 0.6);
      const baseXp = totalXp - taskXp;

      // Check if user already exists
      let existingUser = await User.findOne({ username: username });
      
      if (existingUser) {
        console.log(`⚠️  User "${username}" already exists, skipping user creation...`);
      } else {
        // Create new user
        const newUser = new User({
          username: username,
          email: `${username.toLowerCase()}@fake.com`,
          password: 'fake_password_hash',
          xp: totalXp,
          level: Math.floor(totalXp / 500) + 1,
          isFakeUser: true // Mark as fake for easy cleanup
        });

        existingUser = await newUser.save();
        console.log(`✅ Created user: ${username}`);
      }

      // Generate completion time on Nov 17, 2025
      const completedAt = generateCompletionTime();
      const startedAt = new Date(completedAt.getTime() - timeSpent * 60 * 1000);

      // Create quest progress
      const questProgress = new UserQuestProgress({
        userId: existingUser._id,
        questId: CONFIG.questId,
        status: 'completed',
        tasksCompleted: quest.tasks.length + (quest.dailyTasks?.length || 0),
        totalTasks: quest.tasks.length + (quest.dailyTasks?.length || 0),
        progress: 100,
        startedAt: startedAt,
        completedAt: completedAt,
        timeSpentMinutes: timeSpent,
        xpBreakdown: {
          taskXp: taskXp,
          baseXp: baseXp,
          referralJoinBonus: 0,
          referralCompleteBonus: 0,
          winnerBonus: 0,
          totalXp: totalXp
        },
        usdcEarned: 0,
        taskProgress: []
      });

      await questProgress.save();

      createdUsers.push({
        username: username,
        xp: totalXp,
        timeSpent: timeSpent,
        completedAt: completedAt.toLocaleString()
      });

      console.log(`✅ Progress created: ${username} | ${totalXp} XP | ${timeSpent} mins | ${completedAt.toLocaleString()}`);
    }

    console.log('\n🎉 Injection complete!');
    console.log(`📊 Total users processed: ${createdUsers.length}`);
    console.log('\n🏆 Leaderboard preview (sorted by XP):');
    
    const sortedUsers = createdUsers.sort((a, b) => b.xp - a.xp);
    sortedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} - ${user.xp} XP (${user.timeSpent} mins) - ${user.completedAt}`);
    });

    console.log('\n⚠️  Remember: Run "node inject-leaderboard-users.js cleanup" to remove fake users later!');

  } catch (error) {
    console.error('❌ Error injecting custom users:', error);
  }
}

// ==================== CLEANUP FUNCTION ====================
async function cleanupFakeUsers() {
  try {
    console.log('🧹 Cleaning up fake users...');

    // Find all fake users
    const fakeUsers = await User.find({ isFakeUser: true });
    const fakeUserIds = fakeUsers.map(user => user._id);

    console.log(`📊 Found ${fakeUsers.length} fake users`);

    if (fakeUsers.length === 0) {
      console.log('✅ No fake users to clean up!');
      return;
    }

    // Delete fake quest progress
    const deletedProgress = await UserQuestProgress.deleteMany({
      userId: { $in: fakeUserIds }
    });

    console.log(`✅ Deleted ${deletedProgress.deletedCount} fake progress records`);

    // Delete fake users
    const deletedUsers = await User.deleteMany({
      isFakeUser: true
    });

    console.log(`✅ Deleted ${deletedUsers.deletedCount} fake users`);
    console.log('🎉 Cleanup complete!');

  } catch (error) {
    console.error('❌ Error cleaning up fake users:', error);
  }
}

// ==================== EXECUTE ====================
const args = process.argv.slice(2);
const command = args[0];

async function run() {
  await connectDB();
  
  if (command === 'cleanup') {
    console.log('🧹 Running cleanup...');
    await cleanupFakeUsers();
  } else {
    console.log('💉 Running injection...');
    await injectCustomUsers();
  }
  
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
}

run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// ==================== USAGE ====================
/*
 * SETUP:
 * 1. Update CONFIG.questId with your quest ID
 * 2. Update CONFIG.customUsernames with your desired names
 * 3. Adjust CONFIG.xpRange if needed
 * 4. Adjust CONFIG.timeRange (currently set to 3-8 minutes)
 * 5. Adjust CONFIG.completionDate if needed (currently Nov 17, 2025)
 * 
 * TO INJECT USERS:
 * Run: node inject-leaderboard-users.js
 * 
 * TO CLEANUP FAKE USERS:
 * Run: node inject-leaderboard-users.js cleanup
 */