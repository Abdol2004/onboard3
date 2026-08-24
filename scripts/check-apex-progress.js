require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Quest = require('../models/Quest');
  const UserQuestProgress = require('../models/UserQuestProgress');
  const User = require('../models/User');

  const quest = await Quest.findOne({ title: /apex raiders/i }).lean();
  const records = await UserQuestProgress.find({ questId: quest._id })
    .populate('userId', 'username')
    .lean();

  console.log('Total progress records:', records.length);

  const taskIds = [...(quest.tasks||[]), ...(quest.dailyTasks||[])].map(t => t._id.toString());
  console.log('Current task IDs:', taskIds);

  let noTaskProgress = 0, hasStaleTaskIds = 0, canSubmit = 0;
  for (const r of records) {
    const username = r.userId?.username || r.userId;
    const taskProgIds = (r.taskProgress || []).map(tp => tp.taskId?.toString());
    const hasNewTasks = taskIds.some(id => taskProgIds.includes(id));
    const hasOldOnly = taskProgIds.length > 0 && !hasNewTasks;

    if (r.taskProgress?.length === 0) noTaskProgress++;
    else if (hasOldOnly) hasStaleTaskIds++;
    else canSubmit++;

    if (r.status === 'completed' || r.xpBreakdown?.totalXp > 0) {
      console.log(`${username}: status=${r.status} xp=${r.xpBreakdown?.totalXp} tasksCompleted=${r.tasksCompleted}/${r.totalTasks}`);
    }
  }

  console.log('\nProgress record states:');
  console.log('  Empty taskProgress:', noTaskProgress);
  console.log('  Only old task IDs (stale from reset):', hasStaleTaskIds);
  console.log('  Has current task IDs:', canSubmit);

  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
