require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Check leaderboards
  const lb = await db.collection('leaderboards').find({}).limit(3).toArray();
  console.log('Leaderboards sample:', JSON.stringify(lb[0], null, 2));

  // Check if users have any group/agency field
  const User = require('./models/User');
  const sample = await User.findOne({}).lean();
  const keys = Object.keys(sample);
  console.log('\nUser fields:', keys.join(', '));

  // Any user field mentioning raiders/agency/group
  const raiderFields = keys.filter(k => /raider|agency|group|team|squad|campaign/i.test(k));
  console.log('Raider-related fields:', raiderFields);

  // Check gated quest applications with different quest id
  const allApps = await db.collection('questapplications').find({}).limit(5).toArray();
  console.log('\nAll quest applications (first 5):', allApps.length ? JSON.stringify(allApps[0], null, 2) : 'none');

  const totalApps = await db.collection('questapplications').countDocuments();
  console.log('Total quest applications:', totalApps);

  await mongoose.disconnect();
});
