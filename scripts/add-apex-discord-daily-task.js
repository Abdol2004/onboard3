/**
 * Adds a daily Discord task (50 XP) to the Apex Raiders Campaign.
 * Run once to set it up — it will show as a daily repeatable task for all approved participants.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Quest = require('../models/Quest');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const quest = await Quest.findOne({ slug: 'apex-raiders' });
  if (!quest) { console.error('Apex Raiders quest not found'); process.exit(1); }

  // Check if Discord daily task already exists
  const alreadyExists = quest.dailyTasks && quest.dailyTasks.some(t => t.title === 'Join Discord Community');
  if (alreadyExists) {
    console.log('Discord daily task already exists on Apex Raiders');
    await mongoose.disconnect();
    return;
  }

  quest.dailyTasks = quest.dailyTasks || [];
  quest.dailyTasks.push({
    title:      'Join Discord Community',
    description:'Join the Apex Raiders Discord server and engage with the community.',
    taskType:   'external',
    xpReward:   50,
    isDaily:    true,
    buttonText: 'Join Discord',
    buttonLink: 'https://discord.gg/onboard3',
    inputType:  'none',
    order:      0
  });

  quest.markModified('dailyTasks');
  await quest.save();
  console.log('Discord daily task added to Apex Raiders Campaign');
  await mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
