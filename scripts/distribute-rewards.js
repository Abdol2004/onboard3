/**
 * Credit launch rewards to users' ONBOARD3 usdcBalance.
 * No blockchain needed — this is an internal credit.
 * Safe to re-run: skips already-sent.
 *
 * Usage:
 *   node scripts/distribute-rewards.js           ← live run
 *   node scripts/distribute-rewards.js --dry-run ← preview only
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LaunchReward = require('../models/LaunchReward');
const User = require('../models/User');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const pending = await LaunchReward.find({ status: 'pending' }).sort({ amount: -1 }).lean();
  const totalOwed = pending.reduce((s, r) => s + r.amount, 0);
  console.log(`\n📋 Pending: ${pending.length} users, $${totalOwed.toFixed(2)} to credit`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no changes made\n');
    pending.slice(0, 15).forEach(r => {
      console.log(`  @${r.username.padEnd(22)} $${r.amount.toFixed(2)}  [${r.tier}]`);
    });
    if (pending.length > 15) console.log(`  ... and ${pending.length - 15} more`);
    await mongoose.disconnect();
    return;
  }

  let sent = 0, failed = 0;

  for (const reward of pending) {
    try {
      await User.collection.updateOne(
        { _id: reward.userId },
        { $inc: { usdcBalance: reward.amount } }
      );
      await LaunchReward.updateOne({ _id: reward._id }, {
        $set: { status: 'sent', sentAt: new Date() }
      });
      sent++;
    } catch (err) {
      console.error(`  ❌ FAILED @${reward.username}: ${err.message}`);
      await LaunchReward.updateOne({ _id: reward._id }, {
        $set: { status: 'failed', failReason: err.message }
      });
      failed++;
    }
  }

  console.log(`\n✅ Done — credited: ${sent}  failed: ${failed}\n`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
