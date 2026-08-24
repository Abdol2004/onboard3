require('dotenv').config();
const mongoose = require('mongoose');
const { getAddress } = require('../utils/stacksWallet');
const User = require('../models/User');

async function run() {
  if (!process.env.STACKS_MASTER_SEED) {
    console.error('❌  STACKS_MASTER_SEED not set in .env — aborting');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI not set in .env — aborting');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB\n');

  const users = await User.find(
    { stacksWalletIndex: { $ne: null } },
    'username stacksWalletIndex stacksAddress'
  ).lean();

  console.log(`Found ${users.length} user(s) with custodial Stacks wallets\n`);

  let updated = 0;
  for (const u of users) {
    const newAddress = await getAddress(u.stacksWalletIndex);
    await User.updateOne({ _id: u._id }, { $set: { stacksAddress: newAddress } });
    console.log(`[${u.username}] index=${u.stacksWalletIndex}`);
    console.log(`   OLD: ${u.stacksAddress || '(none)'}`);
    console.log(`   NEW: ${newAddress}\n`);
    updated++;
  }

  console.log(`✅  Done — re-derived and updated ${updated} wallet address(es)`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
