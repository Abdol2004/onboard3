require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Quest = require('../models/Quest');
  const UserQuestProgress = require('../models/UserQuestProgress');
  const User = require('../models/User');

  const TASK_ID   = '6a8f1bfc5b6bea7fef02002d'; // Fourth Task (26/08/26) — xpReward was 0
  const CORRECT_XP = 50;

  // 1. Fix the task itself so future completions get 50 XP
  const quest = await Quest.findOne({ title: /apex raiders/i });
  if (!quest) { console.log('Quest not found'); process.exit(1); }

  const task = quest.tasks.id(TASK_ID) || (quest.dailyTasks || []).find(t => t._id.toString() === TASK_ID);
  if (!task) { console.log('Task not found inside quest'); process.exit(1); }
  if (task.xpReward !== 0) {
    console.log(`Task already has xpReward=${task.xpReward}, no quest update needed.`);
  } else {
    task.xpReward = CORRECT_XP;
    quest.markModified('tasks');
    quest.markModified('dailyTasks');
    await quest.save();
    console.log(`Fixed task xpReward 0 → ${CORRECT_XP}`);
  }

  // 2. Find all progress records where this task was completed with 0 XP
  const allProgress = await UserQuestProgress.find({ questId: quest._id });
  let fixed = 0;

  for (const prog of allProgress) {
    const tp = prog.taskProgress.find(t => t.taskId.toString() === TASK_ID);
    if (!tp || !tp.isCompleted) continue; // not completed yet
    if ((tp.xpEarned || 0) !== 0) {
      console.log(`  skip ${prog.userId} — already has xpEarned=${tp.xpEarned}`);
      continue;
    }

    const user = await User.findById(prog.userId);
    if (!user) { console.log(`  user ${prog.userId} not found`); continue; }

    // Fix the per-task record
    tp.xpEarned = CORRECT_XP;

    // Recompute taskXp from scratch (safer)
    prog.xpBreakdown.taskXp = prog.taskProgress
      .filter(t => t.isCompleted)
      .reduce((s, t) => s + (t.xpEarned || 0), 0);

    prog.xpBreakdown.totalXp =
      (prog.xpBreakdown.taskXp        || 0) +
      (prog.xpBreakdown.baseXp        || 0) +
      (prog.xpBreakdown.referralJoinBonus    || 0) +
      (prog.xpBreakdown.referralCompleteBonus|| 0) +
      (prog.xpBreakdown.winnerBonus   || 0);

    prog.markModified('taskProgress');
    prog.markModified('xpBreakdown');
    await prog.save();

    user.xp = (user.xp || 0) + CORRECT_XP;
    await user.save();

    console.log(`  Awarded +${CORRECT_XP} XP to ${user.username} (user.xp now ${user.xp})`);
    fixed++;
  }

  console.log(`\nDone — fixed ${fixed} user(s).`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
