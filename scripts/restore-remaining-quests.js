// Restore XP for two additional quests damaged by fix-all-xp.js
// NOT covered by emergency-restore-xp.js (they weren't in BAD_QUEST_IDS list)
//
// Quest 697b29e154ea6bc2bc8bfac2: taskXp 230 → 130 (lost 100 each)
//   — some users had tracked tasks (130 via taskProgress) + 100 from untracked path
// Quest 6989b8e51d8b79c89f6ded3a: taskXp 300 → 0 (lost 300 each)
//   — all tasks via admin path, no taskProgress entries

require('dotenv').config();
const mongoose = require('mongoose');
const Quest = require('../models/Quest');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  if (DRY_RUN) console.log('=== DRY RUN — no changes will be written ===\n');

  // ─── QUEST 697b29e154ea6bc2bc8bfac2 ───────────────────────────────────────
  // Pattern: fix script correctly summed taskProgress (130) but missed 100 XP
  // from an untracked path. Current taskXp = 130, should be 230.
  {
    const questId = '697b29e154ea6bc2bc8bfac2';
    const quest = await Quest.findById(questId).lean();
    console.log(`\n=== Quest: ${quest?.title || questId} ===`);

    // Find records where taskXp is exactly 130 (the tracked-only amount the script set)
    // AND tasksCompleted > 0 (definitely had tasks completed)
    const records = await UserQuestProgress.find({
      questId,
      'xpBreakdown.taskXp': 130,
      tasksCompleted: { $gt: 0 },
    });

    console.log(`Found ${records.length} records with taskXp=130`);

    let fixed = 0;
    for (const prog of records) {
      const user = await User.findById(prog.userId);
      if (!user) { console.log(`  User not found for progress ${prog._id}`); continue; }

      const currentTaskXp = prog.xpBreakdown.taskXp || 0;
      const newTaskXp = 230;
      const diff = newTaskXp - currentTaskXp; // +100

      console.log(`  ${user.username}: taskXp ${currentTaskXp} → ${newTaskXp} (user.xp +${diff})`);

      if (!DRY_RUN) {
        prog.xpBreakdown.taskXp = newTaskXp;
        prog.xpBreakdown.totalXp =
          newTaskXp +
          (prog.xpBreakdown.baseXp || 0) +
          (prog.xpBreakdown.referralJoinBonus || 0) +
          (prog.xpBreakdown.referralCompleteBonus || 0) +
          (prog.xpBreakdown.winnerBonus || 0);
        prog.markModified('xpBreakdown');
        await prog.save();

        user.xp += diff;
        await user.save();
      }
      fixed++;
    }
    console.log(`  ${DRY_RUN ? 'Would restore' : 'Restored'} ${fixed} records`);
  }

  // ─── QUEST 6989b8e51d8b79c89f6ded3a ───────────────────────────────────────
  // Pattern: all tasks completed via admin path (empty taskProgress), so fix
  // script computed actualTaskXp=0 and wiped stored 300. Restore to 300.
  {
    const questId = '6989b8e51d8b79c89f6ded3a';
    const quest = await Quest.findById(questId).lean();
    console.log(`\n=== Quest: ${quest?.title || questId} ===`);

    if (quest) {
      const sortedTasks = [...quest.tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log(`Task definitions (${sortedTasks.length} tasks):`);
      sortedTasks.forEach((t, i) => {
        console.log(`  [${i}] "${t.title}" xpReward=${t.xpReward || 0}`);
      });
    }

    // Find records: taskXp=0, tasksCompleted>0, no taskProgress entries
    const records = await UserQuestProgress.find({
      questId,
      'xpBreakdown.taskXp': 0,
      tasksCompleted: { $gt: 0 },
      'taskProgress.0': { $exists: false },
    });

    console.log(`Found ${records.length} records with taskXp=0 + empty taskProgress + tasksCompleted>0`);

    let fixed = 0;
    for (const prog of records) {
      const user = await User.findById(prog.userId);
      if (!user) { console.log(`  User not found for progress ${prog._id}`); continue; }

      // Calculate from task definitions if possible, fall back to 300
      let newTaskXp = 300;
      if (quest) {
        const sortedTasks = [...quest.tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
        const n = Math.min(prog.tasksCompleted, sortedTasks.length);
        const calc = sortedTasks.slice(0, n).reduce((s, t) => s + (t.xpReward || 0), 0);
        if (calc > 0) newTaskXp = calc;
      }

      const diff = newTaskXp - 0; // was zeroed, so diff = newTaskXp

      console.log(`  ${user.username} (${prog.tasksCompleted} tasks): taskXp 0 → ${newTaskXp} (user.xp +${diff})`);

      if (!DRY_RUN) {
        prog.xpBreakdown.taskXp = newTaskXp;
        prog.xpBreakdown.totalXp =
          newTaskXp +
          (prog.xpBreakdown.baseXp || 0) +
          (prog.xpBreakdown.referralJoinBonus || 0) +
          (prog.xpBreakdown.referralCompleteBonus || 0) +
          (prog.xpBreakdown.winnerBonus || 0);
        prog.markModified('xpBreakdown');
        await prog.save();

        user.xp += diff;
        await user.save();
      }
      fixed++;
    }
    console.log(`  ${DRY_RUN ? 'Would restore' : 'Restored'} ${fixed} records`);
  }

  console.log('\nAll done.');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
