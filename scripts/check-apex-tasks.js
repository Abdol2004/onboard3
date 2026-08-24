require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Quest = require('../models/Quest');
  const quest = await Quest.findOne({ title: /apex raiders/i }).lean();
  if (!quest) { console.log('Quest not found'); process.exit(1); }

  console.log('\n=== APEX RAIDERS QUEST ===');
  console.log('baseXpReward:', quest.baseXpReward);
  console.log('questType:', quest.questType);
  console.log('hasEnded:', quest.endDate ? (new Date() > new Date(quest.endDate)) : 'no endDate');
  console.log('endDate:', quest.endDate || 'none');

  const allTasks = [...(quest.tasks || []), ...(quest.dailyTasks || [])];
  console.log('\nTasks (' + allTasks.length + '):');
  allTasks.forEach((t, i) => {
    console.log('\n  Task ' + (i+1) + ': ' + t.title);
    console.log('    _id:', t._id);
    console.log('    taskType:', t.taskType);
    console.log('    xpReward:', t.xpReward);
    console.log('    inputType:', t.inputType);
    console.log('    inputName:', JSON.stringify(t.inputName));
    console.log('    inputLabel:', JSON.stringify(t.inputLabel));
    console.log('    requiresApproval:', t.requiresApproval);
    console.log('    buttonLink:', t.buttonLink ? t.buttonLink.substring(0,60) : 'none');
  });

  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
