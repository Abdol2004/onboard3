// Emergency reversal: restore XP for users whose taskXp was wrongly zeroed
// Run immediately after fix-all-xp.js was killed mid-execution.
// For quests where task xpReward=0 but XP lived in xpBreakdown.taskXp,
// we restore from the User's recentActivity log or recalculate from baseXp.
// Strategy: for affected quests, recalculate totalXp only from baseXp+referral+winner
// and also check if user.xp dropped (comparing global XP vs sum of all quest totalXp).

require('dotenv').config();
const mongoose = require('mongoose');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

// Quests where XP was wrongly zeroed (identified from the bad run output)
// These quests have tasks with xpReward=0 but XP was in xpBreakdown.taskXp
const BAD_QUEST_IDS = [
  '696ade64ac67a59d9c3a13b4', // quest that had mass zeroing
  '691accad98869311a99df4ab',
  '6917c15261daa4a5f9ab52fb',
  '692a48d5cc81fcb68eb29eb7',
  '693d995cad4bb7c933ad8f84',
  '694d87caac67a59d9cbf0d85',
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  // Find all progress records for the bad quests that now have taskXp=0
  // but have completed tasks — these were wrongly zeroed
  const affected = await UserQuestProgress.find({
    questId: { $in: BAD_QUEST_IDS },
    'xpBreakdown.taskXp': 0,
    'taskProgress.0': { $exists: true } // has at least one task entry
  });

  console.log(`Found ${affected.length} potentially affected records`);

  let restored = 0;
  for (const prog of affected) {
    // Check if any tasks are completed but have xpEarned=0 (the broken pattern)
    const completedTasks = prog.taskProgress.filter(t => t.isCompleted);
    if (completedTasks.length === 0) continue;

    const allZeroXp = completedTasks.every(t => (t.xpEarned || 0) === 0);
    if (!allZeroXp) continue; // not the broken pattern

    // We can't recover exact taskXp since it was zeroed, but we can flag these
    // for manual review or use the Quest's task xpReward values
    const Quest = require('../models/Quest');
    const quest = await Quest.findById(prog.questId).lean();
    if (!quest) continue;

    // Calculate what taskXp SHOULD be from quest task definitions
    let recoveredTaskXp = 0;
    for (const tp of completedTasks) {
      const questTask = quest.tasks.find(t => t._id.toString() === tp.taskId.toString());
      if (questTask && questTask.xpReward > 0) {
        tp.xpEarned = questTask.xpReward;
        recoveredTaskXp += questTask.xpReward;
      }
    }

    if (recoveredTaskXp === 0) {
      // Tasks have xpReward=0 in quest definition — XP came from a legacy mechanism
      // We cannot recover these automatically. Log them.
      console.log(`CANNOT_RECOVER ${prog.userId} quest ${prog.questId}: tasks have xpReward=0 in schema, ${completedTasks.length} tasks completed`);
      continue;
    }

    const user = await User.findById(prog.userId);
    if (!user) continue;

    const oldTotal = prog.xpBreakdown.totalXp;
    prog.xpBreakdown.taskXp = recoveredTaskXp;
    prog.xpBreakdown.totalXp =
      recoveredTaskXp +
      (prog.xpBreakdown.baseXp || 0) +
      (prog.xpBreakdown.referralJoinBonus || 0) +
      (prog.xpBreakdown.referralCompleteBonus || 0) +
      (prog.xpBreakdown.winnerBonus || 0);
    prog.markModified('xpBreakdown');
    prog.markModified('taskProgress');
    await prog.save();

    const xpDiff = prog.xpBreakdown.totalXp - oldTotal;
    if (xpDiff !== 0) {
      user.xp += xpDiff;
      await user.save();
    }

    console.log(`Restored ${user.username} quest ${prog.questId}: taskXp=${recoveredTaskXp}, user.xp += ${xpDiff}`);
    restored++;
  }

  console.log(`\nDone — restored ${restored} records. Check CANNOT_RECOVER lines above for manual fixes.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
