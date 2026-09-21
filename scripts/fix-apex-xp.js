require('dotenv').config();
const mongoose = require('mongoose');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const QUEST_ID = '6a8a288a4e3e75dae4324e4c'; // Apex Raiders Campaign
  const all = await UserQuestProgress.find({ questId: QUEST_ID });

  let fixed = 0;
  for (const prog of all) {
    const actualTaskXp = prog.taskProgress
      .filter(t => t.isCompleted)
      .reduce((s, t) => s + (t.xpEarned || 0), 0);

    const storedTaskXp = prog.xpBreakdown?.taskXp || 0;
    const diff = actualTaskXp - storedTaskXp;
    if (diff === 0) continue;

    const user = await User.findById(prog.userId);
    if (!user) { console.log('User not found for', prog._id); continue; }

    console.log(`Fixing ${user.username}: taskXp ${storedTaskXp} → ${actualTaskXp} (+${diff} to user.xp)`);

    prog.xpBreakdown.taskXp = actualTaskXp;
    prog.xpBreakdown.totalXp = actualTaskXp +
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

  console.log(`\nDone — fixed ${fixed} user(s).`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
