require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Quest             = require('../models/Quest');
  const UserQuestProgress = require('../models/UserQuestProgress');
  const User              = require('../models/User');

  const quest = await Quest.findOne({ title: /apex raiders/i });
  if (!quest) { console.log('Quest not found'); process.exit(1); }

  const user = await User.findOne({ username: /beebrain/i });
  if (!user) { console.log('User not found'); process.exit(1); }
  console.log(`Found user: ${user.username} (current XP: ${user.xp})`);

  const rec = await UserQuestProgress.findOne({ questId: quest._id, userId: user._id });
  if (!rec) { console.log('No progress record found'); process.exit(1); }

  const xpToRemove = rec.xpBreakdown?.totalXp || 0;
  console.log(`Removing ${xpToRemove} XP from Beebrain's global XP`);

  if (xpToRemove > 0) {
    await User.findByIdAndUpdate(user._id, { $inc: { xp: -xpToRemove } });
  }

  const resetTasks = (rec.taskProgress || []).map(tp => ({
    taskId: tp.taskId, isCompleted: false, xpEarned: 0,
    approvalStatus: undefined, submissionUrl: undefined,
    submissionText: undefined, submissionData: undefined, completedAt: undefined
  }));

  await UserQuestProgress.updateOne({ _id: rec._id }, {
    $set: {
      status: 'not_started', progress: 0, tasksCompleted: 0, completedAt: null,
      taskProgress: resetTasks,
      'xpBreakdown.taskXp': 0, 'xpBreakdown.baseXp': 0, 'xpBreakdown.totalXp': 0,
      'xpBreakdown.referralJoinBonus': 0, 'xpBreakdown.referralCompleteBonus': 0,
      'xpBreakdown.winnerBonus': 0, isWinner: false, winnerRank: null
    }
  });

  console.log(`Done. Beebrain's Apex Raiders progress reset. Removed ${xpToRemove} XP.`);
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
