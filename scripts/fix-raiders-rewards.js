require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const LaunchReward = require('../models/LaunchReward');

function jitter(base, username) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) & 0xfffffff;
  return Math.round((base + ((h % 100) / 100 - 0.5) * 0.18) * 100) / 100;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // Find apex raiders quest
  const quest = await db.collection('quests').findOne({ slug: 'apex-raiders' });
  if (!quest) { console.log('Quest not found'); await mongoose.disconnect(); return; }
  console.log(`Quest: ${quest.title}`);

  // All approved applications (schema uses questId/userId not quest/user)
  const apps = await db.collection('questapplications')
    .find({ questId: quest._id, status: 'approved' })
    .toArray();
  console.log(`Approved Raiders: ${apps.length}`);

  // Also grab pending/any status in case admin approved via different flow
  const allApps = await db.collection('questapplications')
    .find({ questId: quest._id })
    .toArray();
  console.log(`Total Raiders (all statuses): ${allApps.length}`);

  const userIds = [...new Set(allApps.map(a => a.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('username xp walletAddress twitter').lean();

  let bumped = 0, inserted = 0, kept = 0;

  for (const u of users) {
    const target = jitter(1.50, u.username); // $1.41–$1.59
    const existing = await LaunchReward.findOne({ userId: u._id });

    if (existing) {
      if (existing.amount < 1.00) {
        await LaunchReward.updateOne({ _id: existing._id }, {
          $set: { amount: target, tier: 'raiders_agency', status: 'pending' }
        });
        bumped++;
        console.log(`  ↑ @${u.username}  $${existing.amount.toFixed(2)} → $${target.toFixed(2)}`);
      } else {
        kept++;
        console.log(`  ✓ @${u.username}  $${existing.amount.toFixed(2)} — already good`);
      }
    } else {
      await LaunchReward.create({
        userId: u._id,
        username: u.username,
        walletAddress: u.walletAddress || null,
        amount: target,
        tier: 'raiders_agency',
        xp: u.xp || 0,
        twitterHandle: u.twitter || null,
        status: 'pending'
      });
      inserted++;
      console.log(`  + @${u.username}  $${target.toFixed(2)} (new)`);
    }
  }

  console.log(`\n✅ Raiders done — ${kept} kept, ${bumped} bumped up, ${inserted} newly added`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
