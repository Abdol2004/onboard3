/**
 * Reset any rewards that were marked 'sent' back to 'pending'
 * so they get credited properly when users complete re-onboarding.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LaunchReward = require('../models/LaunchReward');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  // Reset 'sent' records back to pending (they were bulk-sent in error)
  const reset = await LaunchReward.updateMany({ status: 'sent' }, { $set: { status: 'pending', sentAt: null, txSignature: null } });
  console.log(`Reset ${reset.modifiedCount} 'sent' → 'pending'`);

  // Also reverse any usdcBalance that was credited in the dry run (there was none — distribute wasn't actually run)

  const counts = await LaunchReward.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  counts.forEach(c => console.log(`  ${c._id}: ${c.count}`));

  await mongoose.disconnect();
});
