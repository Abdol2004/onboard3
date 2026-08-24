/**
 * Removes the 500 XP winner bonus from all Apex Raiders participants
 * and sets winnerBonusXP to 0 on the quest.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Quest = require('../models/Quest');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const quest = await Quest.findOne({ slug: 'apex-raiders' });
  if (!quest) { console.error('Apex Raiders quest not found'); process.exit(1); }

  // 1. Zero out winnerBonusXP on the quest
  quest.competitionConfig.winnerBonusXP = 0;
  await quest.save();
  console.log('Set winnerBonusXP to 0 on Apex Raiders quest');

  // 2. Find all progress records with winnerBonus > 0
  const records = await UserQuestProgress.find({ questId: quest._id, 'xpBreakdown.winnerBonus': { $gt: 0 } });
  console.log(`Found ${records.length} records with winner bonus to strip`);

  for (const rec of records) {
    const bonus = rec.xpBreakdown.winnerBonus || 0;

    // Deduct from global user XP
    await User.findByIdAndUpdate(rec.userId, { $inc: { xp: -bonus } });

    // Zero out winnerBonus and recalculate totalXp
    rec.xpBreakdown.winnerBonus = 0;
    rec.xpBreakdown.totalXp =
      (rec.xpBreakdown.taskXp || 0) +
      (rec.xpBreakdown.baseXp || 0) +
      (rec.xpBreakdown.referralJoinBonus || 0) +
      (rec.xpBreakdown.referralCompleteBonus || 0);
    rec.isWinner   = false;
    rec.winnerRank = null;
    rec.markModified('xpBreakdown');
    await rec.save();
    console.log(`  Fixed userId ${rec.userId} — removed ${bonus} XP`);
  }

  console.log('Done.');
  await mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
