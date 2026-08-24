/**
 * Seed launch rewards into DB.
 * Run ONCE before distribution: node scripts/seed-launch-rewards.js
 *
 * Custom tiers (admin override):
 *   $5   — Ridique, Zaynab, Lrick 05
 *   $3   — Bolacrypt, Defioyin, Luckee, TRAE♠️, Promzy10, Ragnar, Obasalopi, imxihab, Levrone, Cynthia Anto
 *   $2   — Naana, Abdulkourey, Ibnmarzuk, jayed, GHOSTDEV + active Captains
 *   $1   — DesmondOlord, Brainly, Bless, Nassir1, Destancrypt, Adenuga, BYmusa,
 *           Jonathan, Dominus, King marlito, heelat123 + other Captains
 *   $0.50-1.90 — Very active users below Captain + Kwara email recipients
 *   $0.10-0.49 — New/low-XP users
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const CampusAmbassador = require('../models/CampusAmbassador');
const LaunchReward = require('../models/LaunchReward');

// Tiny jitter so amounts aren't perfectly round
// seed based on username so it's deterministic (reruns get same amounts)
function jitter(base, username) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) & 0xfffffff;
  const frac = (h % 100) / 100; // 0.00 - 0.99
  const delta = (frac - 0.5) * 0.24; // ±0.12
  return Math.round((base + delta) * 100) / 100;
}

// Admin-specified override assignments (username → base amount)
const MANUAL = {
  // $5 tier
  'ridique':      5,
  'zaynab':       5,
  'lrick 05':     5,
  // $3 tier (admin picked)
  'bolacrypt':    3,
  'defioyin':     3,
  'luckee':       3,
  'trae♠️':       3,
  'promzy10':     3,
  'ragnar':       3,
  'obasalopi':    3,
  'imxihab':      3,
  'levrone':      3,
  'cynthia anto': 3,
  // $2 tier
  'naana':        2,
  'abdulkourey':  2,
  'ibnmarzuk':    2,
  'jayed':        2,
  'ghostdev':     2,
  // $1 tier
  'desmonolord':  1, 'desmondolord': 1,
  'brainly':      1,
  'bless':        1,
  'nassir1':      1,
  'destancrypt':  1,
  'adenuga':      1,
  'byмusa':       1, 'bymusa': 1,
  'jonathan':     1,
  'dominus':      1,
  'king marlito': 1,
  'heelat123':    1,
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  // Existing records — don't overwrite
  const existing = await LaunchReward.find({}).select('userId').lean();
  const existingIds = new Set(existing.map(r => r.userId.toString()));
  console.log(`Already seeded: ${existingIds.size} records`);

  // Load all users
  const users = await User.find({}).select('username xp walletAddress lastLogin twitter email').lean();
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 3600 * 1000);

  // Load Kwara ambassador emails
  const kwaraAmbs = await CampusAmbassador.find({ state: { $regex: /kwara/i } }).select('email').lean();
  const kwaraEmails = new Set(kwaraAmbs.map(k => (k.email || '').toLowerCase().trim()));

  const toInsert = [];
  const SYSTEM = new Set(['admin', 'server']);

  for (const u of users) {
    if (SYSTEM.has(u.username.toLowerCase())) continue;
    if (existingIds.has(u._id.toString())) continue;

    const xp = u.xp || 0;
    const active = u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo;
    const isKwara = kwaraEmails.has((u.email || '').toLowerCase().trim());
    const uKey = u.username.toLowerCase().trim();

    let base = 0;
    let tier = '';

    // 1. Manual override
    if (MANUAL[uKey] !== undefined) {
      base = MANUAL[uKey];
      tier = base >= 5 ? 'top5' : base >= 3 ? 'legend_manual' : base >= 2 ? 'captain_active' : 'captain';
    }
    // 2. Kwara ambassador (already emailed, give $1-$1.90)
    else if (isKwara && xp >= 0) {
      base = 1.50;
      tier = 'kwara_ambassador';
    }
    // 3. Algorithm-based tiers
    else if (xp >= 50000 && active)       { base = 4;    tier = 'legend_active'; }
    else if (xp >= 50000)                 { base = 3;    tier = 'legend'; }
    else if (xp >= 25000 && active)       { base = 2;    tier = 'captain_active'; }
    else if (xp >= 25000)                 { base = 1;    tier = 'captain'; }
    else if (xp >= 10000 && active)       { base = 0.75; tier = 'contributor_active'; }
    else if (xp >= 10000)                 { base = 0.50; tier = 'contributor'; }
    else if (xp >= 1000 && active)        { base = 0.25; tier = 'citizen_active'; }
    else if (xp >= 1000)                  { base = 0.20; tier = 'citizen'; }
    else if (xp >= 100)                   { base = 0.10; tier = 'new'; }

    if (base === 0) continue;

    const amount = jitter(base, u.username);

    toInsert.push({
      userId:        u._id,
      username:      u.username,
      walletAddress: u.walletAddress || null,
      amount,
      tier,
      xp,
      twitterHandle: u.twitter || null,
      status:        'pending',
    });
  }

  if (toInsert.length === 0) {
    console.log('Nothing new to seed.');
    await mongoose.disconnect();
    return;
  }

  await LaunchReward.insertMany(toInsert, { ordered: false });
  console.log(`\n✅ Seeded ${toInsert.length} new reward records`);

  // Print summary
  const all = await LaunchReward.find({}).lean();
  const byTier = {};
  let totalPending = 0;
  for (const r of all) {
    if (!byTier[r.tier]) byTier[r.tier] = { count: 0, total: 0, payable: 0 };
    byTier[r.tier].count++;
    byTier[r.tier].total += r.amount;
    if (r.status === 'pending') { byTier[r.tier].payable += r.amount; totalPending += r.amount; }
  }

  console.log('\n  TIER                    COUNT    TOTAL     PAYABLE');
  console.log('─'.repeat(60));
  for (const [t, g] of Object.entries(byTier)) {
    console.log(`  ${t.padEnd(24)} ${String(g.count).padStart(5)}   $${g.total.toFixed(2).padStart(7)}   $${g.payable.toFixed(2).padStart(7)}`);
  }
  console.log(`\n  TOTAL PAYABLE: $${totalPending.toFixed(2)}`);
  console.log('  (users with no wallet are marked skipped_no_wallet)\n');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
