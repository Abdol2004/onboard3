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

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  for (const qid of BAD_QUEST_IDS) {
    const quest = await Quest.findById(qid).lean();
    if (!quest) { console.log(`Quest ${qid} not found`); continue; }

    console.log(`\n=== Quest: ${quest.title} (${qid}) ===`);
    console.log(`Tasks (${quest.tasks.length}):`);
    quest.tasks.forEach((t, i) => {
      console.log(`  [${i}] "${t.title}" xpReward=${t.xpReward || 0} taskType=${t.taskType}`);
    });

    // Find progress records with taskXp=0 but tasksCompleted>0 (wrongly zeroed)
    const wronged = await UserQuestProgress.find({
      questId: qid,
      'xpBreakdown.taskXp': 0,
      tasksCompleted: { $gt: 0 }
    }).lean();

    console.log(`Wrongly zeroed records: ${wronged.length}`);

    // Sample first 3 to understand taskProgress structure
    for (const p of wronged.slice(0, 3)) {
      const user = await User.findById(p.userId).select('username xp').lean();
      console.log(`  User: ${user?.username}, tasksCompleted: ${p.tasksCompleted}, totalXp now: ${p.xpBreakdown?.totalXp}`);
      console.log(`  taskProgress entries: ${p.taskProgress.length}`);
      p.taskProgress.filter(t => t.isCompleted).forEach(tp => {
        const qt = quest.tasks.find(t => t._id.toString() === tp.taskId.toString());
        console.log(`    task "${qt?.title}" xpEarned=${tp.xpEarned} (quest xpReward=${qt?.xpReward || 0})`);
      });
    }
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
