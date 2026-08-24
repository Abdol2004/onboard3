// One-time script: remove step 4 tasks + t-eye-x from OnboardingConfig
// Run: node scripts/cleanup-onboarding.js

require('dotenv').config();
const mongoose = require('mongoose');
const OnboardingConfig = require('../models/OnboardingConfig');

const REMOVE_TASK_IDS = ['t-sol-download', 't-sol-follow', 't-sol-share', 't-eye-x'];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const config = await OnboardingConfig.get();

  const before = config.tasks.length;
  config.tasks = config.tasks.filter(t => !REMOVE_TASK_IDS.includes(t.taskId));
  // Also remove any step 4 extra tasks
  config.extraTasks = config.extraTasks.filter(t => t.step !== 4);

  await config.save();
  console.log(`Removed ${before - config.tasks.length} tasks. Remaining: ${config.tasks.length}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
