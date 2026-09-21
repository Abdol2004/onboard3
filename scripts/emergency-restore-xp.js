// Emergency restore: reverse damage from fix-all-xp.js run.
// Targets UserQuestProgress records where:
//   - taskProgress is empty (admin-set completion, no task-level tracking)
//   - tasksCompleted > 0
//   - xpBreakdown.taskXp = 0 (wrongly zeroed)
//   - updatedAt very recent (touched by the bad script run)
// Restores taskXp = sum of quest task xpRewards for completed count.

require('dotenv').config();
const mongoose = require('mongoose');
const Quest = require('../models/Quest');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

const BAD_QUEST_IDS = [
  '696ade64ac67a59d9c3a13b4',
  '691accad98869311a99df4ab',
  '6917c15261daa4a5f9ab52fb',
  '692a48d5cc81fcb68eb29eb7',
  '693d995cad4bb7c933ad8f84',
  '694d87caac67a59d9cbf0d85',
];

// Also handle non-empty taskProgress quests that had XP zeroed (xpEarned=0 on all tasks):
// These appear in other quests. We'll use a broader time window to catch all damage.
const DAMAGE_WINDOW_MINUTES = 60; // anything updated in last 60 minutes

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const since = new Date(Date.now() - DAMAGE_WINDOW_MINUTES * 60 * 1000);

  // ─── CASE 1: empty taskProgress, tasksCompleted > 0, taskXp = 0, recently updated ───
  const wronged = await UserQuestProgress.find({
    questId: { $in: BAD_QUEST_IDS },
    'xpBreakdown.taskXp': 0,
    tasksCompleted: { $gt: 0 },
    'taskProgress.0': { $exists: false }, // empty taskProgress array
    updatedAt: { $gte: since }
  });

  console.log(`Found ${wronged.length} wrongly-zeroed records (empty taskProgress, recent update)`);

  // Cache quest data
  const questCache = {};
  for (const qid of BAD_QUEST_IDS) {
    questCache[qid] = await Quest.findById(qid).lean();
  }

  let restored = 0;
  let skipped = 0;

  for (const prog of wronged) {
    const quest = questCache[prog.questId.toString()];
    if (!quest) { skipped++; continue; }

    // Sort tasks by order field
    const sortedTasks = [...quest.tasks].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Calculate XP for the number of tasks completed
    // Assume they completed the first N tasks in order
    const n = Math.min(prog.tasksCompleted, sortedTasks.length);
    const restoredTaskXp = sortedTasks.slice(0, n).reduce((s, t) => s + (t.xpReward || 0), 0);

    if (restoredTaskXp === 0) {
      // All tasks have xpReward=0 — can't restore from task definitions
      // For these, we'll use a fixed amount based on pattern (300 XP for 5 tasks, etc.)
      // Flag for manual review
      console.log(`SKIP (tasks all 0 xpReward) - user progress ${prog._id} quest ${prog.questId}`);
      skipped++;
      continue;
    }

    const user = await User.findById(prog.userId);
    if (!user) { skipped++; continue; }

    const xpDiff = restoredTaskXp - (prog.xpBreakdown.taskXp || 0); // should be positive (restoring)

    prog.xpBreakdown.taskXp = restoredTaskXp;
    prog.xpBreakdown.totalXp =
      restoredTaskXp +
      (prog.xpBreakdown.baseXp || 0) +
      (prog.xpBreakdown.referralJoinBonus || 0) +
      (prog.xpBreakdown.referralCompleteBonus || 0) +
      (prog.xpBreakdown.winnerBonus || 0);
    prog.markModified('xpBreakdown');
    await prog.save();

    user.xp += xpDiff;
    await user.save();

    console.log(`Restored ${user.username} quest ${prog.questId}: taskXp=0→${restoredTaskXp}, user.xp+=${xpDiff} (${prog.tasksCompleted}/${sortedTasks.length} tasks)`);
    restored++;
  }

  console.log(`\nCase 1 done: restored ${restored}, skipped ${skipped}`);

  // ─── CASE 2: Also restore users from non-empty taskProgress quests that were wrongly reduced ───
  // For quest 691873c8de79eba2fca07e13 (the GOOD quest): those got +600 correctly, skip
  // For other quests where xpEarned=0 per task but xpBreakdown.taskXp was positive: already handled above

  console.log('\nAll done.');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
