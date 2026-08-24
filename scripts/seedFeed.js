/**
 * Seed community feed events for demo users: beebrain, zaynab, donsmith
 * Run: node scripts/seedFeed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User      = require('../models/User');
const FeedEvent = require('../models/FeedEvent');

const SEEDS = [
  { username:'beebrain',  type:'role_upgrade',    data:{ oldRole:'citizen', newRole:'contributor' } },
  { username:'beebrain',  type:'usdc_earned',     data:{ amount:5.00, questTitle:'Web3 Basics Challenge' } },
  { username:'zaynab',    type:'quest_completed', data:{ questTitle:'Intro to DeFi' } },
  { username:'zaynab',    type:'role_upgrade',    data:{ oldRole:'contributor', newRole:'captain' } },
  { username:'donsmith',  type:'usdc_earned',     data:{ amount:12.50, questTitle:'Community Builder Quest' } },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const seed of SEEDS) {
    const user = await User.findOne({ username: { $regex: new RegExp('^' + seed.username + '$', 'i') } }).select('_id username');
    if (!user) {
      console.log('  SKIP: user not found —', seed.username);
      continue;
    }

    const existing = await FeedEvent.findOne({ userId: user._id, type: seed.type, 'data.questTitle': seed.data.questTitle || null });
    if (existing) {
      console.log('  SKIP: already seeded —', seed.username, seed.type);
      continue;
    }

    const ev = new FeedEvent({
      type:     seed.type,
      userId:   user._id,
      username: user.username,
      data:     seed.data,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000))
    });
    await ev.save();
    console.log('  SEEDED:', seed.username, seed.type);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
