/**
 * One-time fix: remove Don3x as winner from the Ginox bounty,
 * reset their submission status, and delete any winner notification sent to them.
 *
 * Run: node scripts/fix-ginox-winner.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User             = require('../models/User');
  const Bounty           = require('../models/Bounty');
  const BountySubmission = require('../models/BountySubmission');
  const ThirdPartySubmission = require('../models/ThirdPartySubmission');
  const Notification     = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');

  // Find Don3x
  const don3x = await User.findOne({ username: /^don3x/i }).lean();
  if (!don3x) { console.error('User Don3x not found'); process.exit(1); }
  console.log(`Found Don3x: ${don3x._id}`);

  // Find the Ginox bounty (internal)
  const bounty = await Bounty.findOne({ title: /ginox/i });
  if (!bounty) {
    console.log('No internal Ginox bounty found — checking ThirdPartySubmission only');
  } else {
    console.log(`Found bounty: "${bounty.title}" (${bounty._id})`);

    // Remove Don3x from winners array
    const before = bounty.winners.length;
    bounty.winners = bounty.winners.filter(
      w => w.userId?.toString() !== don3x._id.toString()
    );
    console.log(`Removed ${before - bounty.winners.length} winner entry/entries`);
    await bounty.save();
    console.log('Bounty winners updated');

    // Reset BountySubmission status
    const sub = await BountySubmission.findOne({ bountyId: bounty._id, userId: don3x._id });
    if (sub) {
      sub.status    = 'pending';
      sub.rank      = null;
      sub.amountWon = null;
      await sub.save();
      console.log('BountySubmission reset to "submitted"');
    } else {
      console.log('No BountySubmission found for Don3x on this bounty');
    }
  }

  // Reset ThirdPartySubmission winner status (ZAD bounties with "ginox" in name)
  const tpSubs = await ThirdPartySubmission.find({
    userId: don3x._id,
    status: 'winner',
    bountyName: /ginox/i
  });
  for (const tp of tpSubs) {
    tp.status = 'submitted';
    await tp.save();
    console.log(`ThirdPartySubmission ${tp._id} reset to "submitted"`);
  }

  // Delete any bounty winner notifications sent to Don3x mentioning ginox
  const notifResult = await mongoose.connection.collection('notifications').deleteMany({
    userId: don3x._id,
    $or: [
      { message: /ginox/i },
      { title:   /bounty/i, message: /won/i },
    ]
  });
  console.log(`Deleted ${notifResult.deletedCount} notification(s) for Don3x`);

  console.log('Done.');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
