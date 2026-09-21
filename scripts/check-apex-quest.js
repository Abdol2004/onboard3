require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Quest = require('../models/Quest');
  const quest = await Quest.findOne({ title: /apex raiders/i }).lean();

  console.log('isActive:', quest.isActive);
  console.log('questType:', quest.questType);
  console.log('endDate:', quest.endDate);
  console.log('startDate:', quest.startDate);
  console.log('hasEnded (manual):', quest.endDate ? new Date() > new Date(quest.endDate) : false);
  console.log('maxParticipants:', quest.maxParticipants);
  console.log('totalParticipants:', quest.totalParticipants);
  console.log('totalCompletions:', quest.totalCompletions);
  console.log('rewardPlan:', JSON.stringify(quest.rewardPlan));
  console.log('questStatus (isActive+endDate):', quest.isActive ? 'active' : 'INACTIVE');

  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
