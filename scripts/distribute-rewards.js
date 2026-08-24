/**
 * Distribute launch rewards — sends USDC to all pending records.
 * Safe to re-run: skips already-sent. Logs every transfer.
 *
 * Usage: node scripts/distribute-rewards.js [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LaunchReward = require('../models/LaunchReward');
const { sendUsdc, getTreasuryBalance } = require('../utils/sendUsdc');

const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 1500; // delay between txs to avoid rate limits

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const balance = await getTreasuryBalance();
  if (balance !== null) {
    console.log(`\n💰 Treasury USDC balance: $${balance !== null ? balance.toFixed(2) : 'unknown'}`);
  }

  const pending = await LaunchReward.find({ status: 'pending' }).sort({ amount: -1 }).lean();
  const totalOwed = pending.reduce((s, r) => s + r.amount, 0);
  console.log(`\n📋 Pending rewards: ${pending.length} users, $${totalOwed.toFixed(2)} total`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no actual transfers will be made\n');
    pending.slice(0, 10).forEach(r => {
      console.log(`  @${r.username.padEnd(22)} → $${r.amount.toFixed(2)} → ${r.walletAddress}`);
    });
    if (pending.length > 10) console.log(`  ... and ${pending.length - 10} more`);
    await mongoose.disconnect();
    return;
  }

  if (balance !== null && balance < totalOwed) {
    console.error(`\n❌ Insufficient USDC balance ($${balance.toFixed(2)}) to cover $${totalOwed.toFixed(2)}`);
    console.error('   Fund the treasury wallet and re-run.\n');
    await mongoose.disconnect();
    process.exit(1);
  }

  let sent = 0, failed = 0, skipped = 0;

  for (const reward of pending) {
    if (!reward.walletAddress) {
      await LaunchReward.updateOne({ _id: reward._id }, { $set: { status: 'skipped_no_wallet' } });
      skipped++;
      continue;
    }

    try {
      console.log(`  Sending $${reward.amount.toFixed(2)} → @${reward.username} (${reward.walletAddress.slice(0,8)}...)`);
      const sig = await sendUsdc(reward.walletAddress, reward.amount);
      await LaunchReward.updateOne({ _id: reward._id }, {
        $set: { status: 'sent', txSignature: sig, sentAt: new Date() }
      });
      console.log(`  ✅ TX: ${sig}`);
      sent++;
    } catch (err) {
      console.error(`  ❌ FAILED @${reward.username}: ${err.message}`);
      await LaunchReward.updateOne({ _id: reward._id }, {
        $set: { status: 'failed', failReason: err.message }
      });
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`  Sent:    ${sent}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped} (no wallet)`);
  console.log(`═══════════════════════════════════\n`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
