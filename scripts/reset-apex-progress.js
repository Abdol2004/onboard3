// One-time script: reset all Apex Raiders quest progress
// Run: node scripts/reset-apex-progress.js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const Quest             = require('../models/Quest');
  const UserQuestProgress = require('../models/UserQuestProgress');
  const User              = require('../models/User');

  // Find Apex Raiders quest
  const quest = await Quest.findOne({ title: /apex raiders/i });
  if (!quest) { console.log('Quest not found'); process.exit(1); }
  console.log(`Found quest: ${quest.title} (${quest._id})`);

  // Zero completion bonuses on the quest itself
  quest.baseXpReward = 0;
  if (quest.competitionConfig) {
    quest.competitionConfig.winnerBonusXP = 0;
    quest.markModified('competitionConfig');
  }
  await quest.save();
  console.log('Quest baseXpReward and winnerBonusXP zeroed');

  // Get all progress records
  const records = await UserQuestProgress.find({ questId: quest._id });
  console.log(`Found ${records.length} participant records`);

  let deducted = 0;
  for (const rec of records) {
    const totalXpToRemove = rec.xpBreakdown?.totalXp || 0;
    if (totalXpToRemove > 0) {
      await User.findByIdAndUpdate(rec.userId, { $inc: { xp: -totalXpToRemove } });
      deducted += totalXpToRemove;
    }

    // Reset task completions but keep taskProgress array structure
    const resetTasks = (rec.taskProgress || []).map(tp => ({
      taskId:         tp.taskId,
      isCompleted:    false,
      xpEarned:       0,
      approvalStatus: undefined,
      submissionUrl:  undefined,
      submissionText: undefined,
      submissionData: undefined,
      completedAt:    undefined
    }));

    await UserQuestProgress.updateOne({ _id: rec._id }, {
      $set: {
        status:         'not_started',
        progress:       0,
        tasksCompleted: 0,
        completedAt:    null,
        taskProgress:   resetTasks,
        'xpBreakdown.taskXp':               0,
        'xpBreakdown.baseXp':               0,
        'xpBreakdown.totalXp':              0,
        'xpBreakdown.referralJoinBonus':    0,
        'xpBreakdown.referralCompleteBonus':0,
        'xpBreakdown.winnerBonus':          0,
        isWinner:   false,
        winnerRank: null
      }
    });
  }

  console.log(`Done. Reset ${records.length} participants. Deducted ${deducted} total XP from user accounts.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
