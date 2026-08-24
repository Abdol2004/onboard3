require('dotenv').config();
const mongoose = require('mongoose');
const LaunchReward = require('../models/LaunchReward');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const r = await LaunchReward.updateMany(
    { status: 'skipped_no_wallet' },
    { $set: { status: 'pending' } }
  );
  console.log(`Reset ${r.modifiedCount} skipped_no_wallet → pending`);

  const counts = await LaunchReward.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]);
  counts.forEach(c => console.log(`  ${c._id}: ${c.count} users, $${c.total.toFixed(2)}`));

  await mongoose.disconnect();
});
