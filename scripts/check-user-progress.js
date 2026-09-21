require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Quest = require('../models/Quest');
  const UserQuestProgress = require('../models/UserQuestProgress');
  const User = require('../models/User');

  const quest = await Quest.findOne({ title: /apex raiders/i }).lean();
  const allTasks = [...(quest.tasks || []), ...(quest.dailyTasks || [])];
  const taskIds = allTasks.map(t => t._id.toString());

  const usernames = ['bolacrypt', 'dultimateroyale', 'royaLBLISS', 'royalbliss'];
  const users = await User.find({ username: { $in: usernames.map(u => new RegExp('^' + u + '$', 'i')) } }).lean();

  if (!users.length) { console.log('Users not found'); process.exit(1); }

  for (const user of users) {
    console.log('\n=== ' + user.username + ' ===');
    console.log('userId:', user._id);
    console.log('xp:', user.xp);

    const progress = await UserQuestProgress.findOne({ userId: user._id, questId: quest._id }).lean();
    if (!progress) {
      console.log('NO progress record found');
      continue;
    }

    console.log('status:', progress.status);
    console.log('tasksCompleted:', progress.tasksCompleted, '/', progress.totalTasks);
    console.log('totalXp:', progress.xpBreakdown?.totalXp);
    console.log('taskProgress entries:', progress.taskProgress?.length);

    (progress.taskProgress || []).forEach((tp, i) => {
      const taskIdx = taskIds.indexOf(tp.taskId?.toString());
      const isCurrentTask = taskIdx >= 0;
      console.log('  [' + i + '] taskId=' + tp.taskId + (isCurrentTask ? ' (Task ' + (taskIdx+1) + ')' : ' (STALE/OLD)'));
      console.log('       isCompleted=' + tp.isCompleted + ' approvalStatus=' + tp.approvalStatus);
      if (tp.submissionUrl) console.log('       submissionUrl=' + tp.submissionUrl);
      if (tp.submissionData) console.log('       submissionData=' + JSON.stringify(tp.submissionData));
    });
  }

  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
