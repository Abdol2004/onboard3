/**
 * Apply admin's custom reward overrides to existing LaunchReward records.
 * Run after seed: node scripts/apply-reward-overrides.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LaunchReward = require('../models/LaunchReward');

// username (lowercase) → { amount, tier }
const OVERRIDES = {
  // $5 tier — keep as-is (already correct)
  // $3 tier admin picks
  'bolacrypt':    { amount: 2.91, tier: 'legend_manual' },
  'defioyin':     { amount: 3.07, tier: 'legend_manual' },
  'luckee':       { amount: 2.88, tier: 'legend_manual' },
  'trae♠️':       { amount: 3.04, tier: 'legend_manual' },
  'promzy10':     { amount: 2.96, tier: 'legend_manual' },
  'ragnar':       { amount: 2.83, tier: 'legend_manual' },
  'obasalopi':    { amount: 3.12, tier: 'legend' },
  'imxihab':      { amount: 2.87, tier: 'legend' },
  'levrone':      { amount: 3.09, tier: 'legend' },
  'cynthia anto': { amount: 2.94, tier: 'legend' },
  // $2 tier
  'naana':       { amount: 1.97, tier: 'captain_active' },
  'abdulkourey': { amount: 2.03, tier: 'captain_active' },
  'ibnmarzuk':   { amount: 1.94, tier: 'captain_active' },
  'jayed':       { amount: 2.08, tier: 'captain_active' },
  'ghostdev':    { amount: 1.91, tier: 'captain_active' },
  // $1 tier
  'desmondolord':  { amount: 1.02, tier: 'captain' },
  'brainly':       { amount: 0.97, tier: 'captain' },
  'bless':         { amount: 1.04, tier: 'captain' },
  'nassir1':       { amount: 0.99, tier: 'captain' },
  'destancrypt':   { amount: 1.03, tier: 'captain' },
  'adenuga':       { amount: 0.98, tier: 'captain' },
  'bymusa':        { amount: 1.01, tier: 'captain' },
  'jonathan':      { amount: 0.96, tier: 'captain' },
  'dominus':       { amount: 1.05, tier: 'captain' },
  'king marlito':  { amount: 0.93, tier: 'captain' },
  'heelat123':     { amount: 1.07, tier: 'captain' },
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  for (const [uname, ov] of Object.entries(OVERRIDES)) {
    const res = await LaunchReward.updateOne(
      { username: { $regex: new RegExp('^' + uname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$', 'i') } },
      { $set: { amount: ov.amount, tier: ov.tier } }
    );
    const matched = res.matchedCount;
    if (matched) console.log(`✅ Updated @${uname} → $${ov.amount}`);
    else         console.log(`⚠️  Not found: @${uname}`);
  }

  // Print the major recipients ($1+)
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  MAJOR RECIPIENTS AFTER OVERRIDES ($1.00+)');
  console.log('══════════════════════════════════════════════════════════\n');

  const major = await LaunchReward.find({ amount: { $gte: 1 } }).sort({ amount: -1, xp: -1 }).lean();
  major.forEach((r, i) => {
    const wallet = r.walletAddress ? '✅' : '❌ NO WALLET';
    const tw = r.twitterHandle ? `@${r.twitterHandle}` : '(no X)';
    console.log(`${String(i+1).padStart(3)}. @${r.username.padEnd(22)} $${r.amount.toFixed(2)}  [${r.tier}]  ${(r.xp||0).toLocaleString().padStart(9)} XP  ${wallet}  ${tw}`);
  });

  const totalMajor = major.reduce((s,r)=>s+r.amount,0);
  const withWallet = major.filter(r=>r.walletAddress);
  console.log(`\n  ${major.length} major recipients · $${totalMajor.toFixed(2)} total · ${withWallet.length} have wallets`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
