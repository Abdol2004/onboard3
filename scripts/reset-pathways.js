/**
 * Reset all users' pathway selection so they must choose again during re-onboarding.
 * Run once before launch day.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const result = await User.updateMany(
    {},
    {
      $set: {
        pathway: null,
        pathwayStatus: null,
        pathwayApplication: { reason: '', experience: '', appliedAt: null, reviewedAt: null, reviewNote: '' }
      }
    }
  );
  console.log(`Reset pathway for ${result.modifiedCount} users`);
  await mongoose.disconnect();
}).catch(err => {
  console.error('DB connection error:', err);
  process.exit(1);
});
