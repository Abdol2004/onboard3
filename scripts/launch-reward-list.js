/**
 * Launch Day Reward Calculator — Aug 24 2026
 * Budget: $200 total. Show major recipients ($1+) + summary.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const BUDGET = 200.00;
const SYSTEM_ACCOUNTS = ['admin', 'server'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const users = await User.find({})
    .select('username xp walletAddress lastLogin createdAt twitter')
    .lean();

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 3600 * 1000);

  // Score every qualifying user
  const candidates = [];
  for (const u of users) {
    if (SYSTEM_ACCOUNTS.includes(u.username.toLowerCase())) continue;
    const xp = u.xp || 0;
    if (xp < 100) continue; // skip people with no meaningful activity

    const active = u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo;
    const hasWallet = !!(u.walletAddress && u.walletAddress.trim());

    let reward = 0;
    let tier = '';

    if (xp >= 50000 && active) {
      reward = 5.00; tier = 'Legend+active';
    } else if (xp >= 50000) {
      reward = 3.00; tier = 'Legend';
    } else if (xp >= 25000 && active) {
      reward = 2.00; tier = 'Captain+active';
    } else if (xp >= 25000) {
      reward = 1.00; tier = 'Captain';
    } else if (xp >= 10000 && active) {
      reward = 0.75; tier = 'Contributor+active';
    } else if (xp >= 10000) {
      reward = 0.50; tier = 'Contributor';
    } else if (xp >= 1000 && active) {
      reward = 0.25; tier = 'Citizen+active';
    } else if (xp >= 1000) {
      reward = 0.20; tier = 'Citizen';
    } else if (xp >= 100) {
      reward = 0.10; tier = 'New';
    }

    if (reward > 0) {
      candidates.push({ username: u.username, xp, reward, tier, hasWallet, active, twitter: u.twitter || '' });
    }
  }

  // Sort: highest reward first, then by XP
  candidates.sort((a, b) => b.reward - a.reward || b.xp - a.xp);

  // Enforce max 5 people at $5 (Legend+active)
  let legendActiveCount = 0;
  for (const r of candidates) {
    if (r.tier === 'Legend+active') {
      legendActiveCount++;
      if (legendActiveCount > 5) {
        r.reward = 3.00;
        r.tier = 'Legend';
      }
    }
  }

  // Re-sort after tier adjustment
  candidates.sort((a, b) => b.reward - a.reward || b.xp - a.xp);

  // Budget cap: allocate in order until $200 is spent
  const rewarded = [];
  let spent = 0;
  for (const r of candidates) {
    if (spent + r.reward > BUDGET + 0.001) {
      // Try fitting a smaller amount for the last slot
      break;
    }
    rewarded.push(r);
    spent += r.reward;
    if (Math.abs(spent - BUDGET) < 0.001) break;
  }

  // Print major recipients ($1+)
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  LAUNCH DAY REWARDS — MAJOR RECIPIENTS ($1.00 and above)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const major = rewarded.filter(r => r.reward >= 1.00);
  major.forEach((r, i) => {
    const wallet = r.hasWallet ? '✅' : '❌ NO WALLET';
    const tw = r.twitter ? `@${r.twitter}` : '(no X linked)';
    console.log(
      `${String(i+1).padStart(3)}. @${r.username.padEnd(22)} $${r.reward.toFixed(2)}  ${r.tier.padEnd(20)} ${r.xp.toLocaleString().padStart(9)} XP  ${wallet}  ${tw}`
    );
  });

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`  ${major.length} major recipients   $${major.reduce((s,r)=>s+r.reward,0).toFixed(2)} from major tier\n`);

  // Tier summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FULL TIER BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const tierGroups = {};
  for (const r of rewarded) {
    if (!tierGroups[r.tier]) tierGroups[r.tier] = { count:0, total:0, withWallet:0 };
    tierGroups[r.tier].count++;
    tierGroups[r.tier].total += r.reward;
    if (r.hasWallet) tierGroups[r.tier].withWallet++;
  }

  const tierOrder = ['Legend+active','Legend','Captain+active','Captain','Contributor+active','Contributor','Citizen+active','Citizen','New'];
  for (const t of tierOrder) {
    const g = tierGroups[t];
    if (!g) continue;
    const ppu = g.total / g.count;
    console.log(`  ${t.padEnd(22)} ${String(g.count).padStart(4)} users @ $${ppu.toFixed(2)} = $${g.total.toFixed(2).padStart(7)}   ${g.withWallet}/${g.count} have wallet`);
  }

  const withWallet = rewarded.filter(r => r.hasWallet);
  const noWallet   = rewarded.filter(r => !r.hasWallet);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  TOTAL REWARDED   : ${rewarded.length} users`);
  console.log(`  HAS WALLET       : ${withWallet.length} → $${withWallet.reduce((s,r)=>s+r.reward,0).toFixed(2)} will be paid out`);
  console.log(`  NO WALLET        : ${noWallet.length} → $${noWallet.reduce((s,r)=>s+r.reward,0).toFixed(2)} will be skipped`);
  console.log(`  TOTAL ALLOCATED  : $${spent.toFixed(2)} / $${BUDGET.toFixed(2)} budget`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
