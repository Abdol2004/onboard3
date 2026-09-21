require('dotenv').config();
const mongoose = require('mongoose');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const all = await UserQuestProgress.find({});
  console.log(`Checking ${all.length} progress records...`);

  let fixed = 0;
  for (const prog of all) {
    const actualTaskXp = prog.taskProgress
      .filter(t => t.isCompleted)
      .reduce((s, t) => s + (t.xpEarned || 0), 0);

    const storedTaskXp = prog.xpBreakdown?.taskXp || 0;
    const diff = actualTaskXp - storedTaskXp;
    if (diff === 0) continue;

    const user = await User.findById(prog.userId);
    if (!user) { console.log('User not found for progress', prog._id); continue; }

    console.log(`Fixing ${user.username} (quest ${prog.questId}): taskXp ${storedTaskXp} → ${actualTaskXp} (+${diff})`);

    prog.xpBreakdown.taskXp = actualTaskXp;
    prog.xpBreakdown.totalXp =
      actualTaskXp +
      (prog.xpBreakdown.baseXp || 0) +
      (prog.xpBreakdown.referralJoinBonus || 0) +
      (prog.xpBreakdown.referralCompleteBonus || 0) +
      (prog.xpBreakdown.winnerBonus || 0);
    prog.markModified('xpBreakdown');
    await prog.save();

    user.xp += diff;
    await user.save();
    fixed++;
  }

  console.log(`\nDone — fixed ${fixed} / ${all.length} records.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
