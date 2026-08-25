require('dotenv').config();
const mongoose = require('mongoose');
const FeedEvent = require('../models/FeedEvent');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  // Delete events whose userId doesn't match any real User
  const all = await FeedEvent.find().select('_id userId username').lean();
  const userIds = [...new Set(all.map(ev => ev.userId?.toString()).filter(Boolean))];
  const realUsers = await User.find({ _id: { $in: userIds } }).select('_id').lean();
  const realSet = new Set(realUsers.map(u => u._id.toString()));

  const toDelete = all.filter(ev => !ev.userId || !realSet.has(ev.userId.toString()));
  if (!toDelete.length) {
    console.log('No orphan feed events found. Feed is clean.');
    process.exit(0);
  }

  console.log('Deleting', toDelete.length, 'orphan feed event(s):');
  toDelete.forEach(ev => console.log(' -', ev.username, '(' + ev._id + ')'));

  await FeedEvent.deleteMany({ _id: { $in: toDelete.map(ev => ev._id) } });
  console.log('Done — orphan events removed.');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
