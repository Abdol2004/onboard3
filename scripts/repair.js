/**
 * repairReferralXp.js
 * 
 * Fixes referral XP not being counted for users who referred others
 * that have already joined/completed quests.
 * 
 * Run with: node repairReferralXp.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Quest = require('../models/Quest');
const User = require('../models/User');
const UserQuestProgress = require('../models/UserQuestProgress');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdb';
const DRY_RUN = process.argv.includes('--dry-run'); // pass --dry-run to preview only
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
  console.log(DRY_RUN ? '🔍 DRY RUN - no changes will be saved\n' : '💾 LIVE RUN - changes will be saved\n');

  let totalReferrersFixed = 0;
  let totalXpAwarded = 0;
  let totalGlobalXpAwarded = 0;

  // 1. Find all users who were referred by someone (referredBy is set)
  const referredUsers = await User.find({ referredBy: { $exists: true, $ne: null, $ne: '' } });
  console.log(`👥 Found ${referredUsers.length} users who were referred by someone\n`);

  for (const referredUser of referredUsers) {
    // 2. Find the referrer by their referralCode
    const referrer = await User.findOne({ referralCode: referredUser.referredBy });
    if (!referrer) {
      console.log(`⚠️  No referrer found for code "${referredUser.referredBy}" (user: ${referredUser.username}) — skipping`);
      continue;
    }

    // 3. Find all quests this referred user has progress on
    const referredUserProgresses = await UserQuestProgress.find({ userId: referredUser._id });

    for (const referredProgress of referredUserProgresses) {
      const questId = referredProgress.questId;

      // 4. Load the quest and check referral config
      const quest = await Quest.findById(questId);
      if (!quest) continue;
      if (!quest.referralConfig?.enabled) continue;

      const xpJoin = quest.referralConfig.xpPerReferralJoin || 0;
      const xpComplete = quest.referralConfig.xpPerReferralComplete || 0;

      // 5. Find or skip referrer's progress for this quest
      let referrerProgress = await UserQuestProgress.findOne({
        userId: referrer._id,
        questId: questId
      });

      let referrerXpToAdd = 0;

      // ── JOIN BONUS ──────────────────────────────────────────────────────────
      const hasJoined = ['in_progress', 'completed'].includes(referredProgress.status);
      if (hasJoined && xpJoin > 0) {
        if (referrerProgress) {
          const alreadyCounted = referrerProgress.referralStats.referralsJoined.some(
            r => r.userId.toString() === referredUser._id.toString()
          );

          if (!alreadyCounted) {
            console.log(`  ➕ JOIN bonus: ${referrer.username} ← ${referredUser.username} (+${xpJoin} XP) [quest: ${quest.title}]`);
            referrerXpToAdd += xpJoin;

            if (!DRY_RUN) {
              referrerProgress.referralStats.referralsJoined.push({
                userId: referredUser._id,
                joinedAt: referredProgress.startedAt || new Date(),
                xpEarned: xpJoin
              });
            }
          }
        } else {
          // Referrer hasn't started the quest — only fix global XP (below)
          console.log(`  ℹ️  JOIN bonus: ${referrer.username} hasn't started quest "${quest.title}" — global XP only (+${xpJoin})`);
          referrerXpToAdd += xpJoin;
        }
      }

      // ── COMPLETE BONUS ──────────────────────────────────────────────────────
      if (referredProgress.status === 'completed' && xpComplete > 0) {
        if (referrerProgress) {
          const alreadyCounted = referrerProgress.referralStats.referralsCompleted.some(
            r => r.userId.toString() === referredUser._id.toString()
          );

          if (!alreadyCounted) {
            console.log(`  🏆 COMPLETE bonus: ${referrer.username} ← ${referredUser.username} (+${xpComplete} XP) [quest: ${quest.title}]`);
            referrerXpToAdd += xpComplete;

            if (!DRY_RUN) {
              referrerProgress.referralStats.referralsCompleted.push({
                userId: referredUser._id,
                completedAt: referredProgress.completedAt || new Date(),
                xpEarned: xpComplete
              });
            }
          }
        } else {
          console.log(`  ℹ️  COMPLETE bonus: ${referrer.username} hasn't started quest "${quest.title}" — global XP only (+${xpComplete})`);
          referrerXpToAdd += xpComplete;
        }
      }

      // 6. Save referrer's quest progress with recalculated XP
      if (!DRY_RUN && referrerProgress && referrerXpToAdd > 0) {
        referrerProgress.calculateReferralXp();
        referrerProgress.markModified('xpBreakdown');
        referrerProgress.markModified('referralStats');
        await referrerProgress.save();
        totalXpAwarded += referrerXpToAdd;
      }

      // 7. Fix referrer's global XP on User document
      if (!DRY_RUN && referrerXpToAdd > 0) {
        referrer.xp = (referrer.xp || 0) + referrerXpToAdd;
        referrer.recentActivity = referrer.recentActivity || [];
        referrer.recentActivity.unshift({
          action: `[Repair] Referral XP added for ${referredUser.username} (+${referrerXpToAdd} XP)`,
          timestamp: new Date()
        });
        if (referrer.recentActivity.length > 10) {
          referrer.recentActivity = referrer.recentActivity.slice(0, 10);
        }
        await referrer.save();
        totalGlobalXpAwarded += referrerXpToAdd;
        totalReferrersFixed++;
      } else if (DRY_RUN && referrerXpToAdd > 0) {
        totalXpAwarded += referrerXpToAdd;
        totalReferrersFixed++;
      }
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('📊 REPAIR SUMMARY');
  console.log(`   Referrers fixed  : ${totalReferrersFixed}`);
  console.log(`   Quest XP awarded : ${totalXpAwarded}`);
  if (!DRY_RUN) {
    console.log(`   Global XP added  : ${totalGlobalXpAwarded}`);
  }
  console.log(DRY_RUN ? '\n⚠️  DRY RUN complete — run without --dry-run to apply fixes' : '\n✅ All fixes applied');
  console.log('══════════════════════════════════════════');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});