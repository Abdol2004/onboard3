/**
 * repairReferralXp.js
 *
 * Fixes missing referral XP for a SINGLE quest.
 * XP values are set manually here — ignores whatever is in the DB.
 * Also patches the quest's referralConfig in DB so future referrals work.
 *
 * Place in /scripts/ folder
 *
 * Run with:
 *   node scripts/repairReferralXp.js --dry-run   ← preview only
 *   node scripts/repairReferralXp.js             ← apply fixes
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Quest = require('../models/Quest');
const UserQuestProgress = require('../models/UserQuestProgress');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// 👇 SET THESE VALUES BEFORE RUNNING

const QUEST_ID = '69c3ab247db8dcfae44e88b0';

// XP given to referrer when their referred user JOINS the quest
const XP_PER_JOIN = 50;

// XP given to referrer when their referred user COMPLETES the quest
const XP_PER_COMPLETE = 100;

// ─────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');

async function repairReferralXp() {
  try {
    if (QUEST_ID === 'PASTE_QUEST_ID_HERE') {
      console.error('❌ You forgot to set QUEST_ID at the top of the script!');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI ||
                     process.env.MONGO_URI    ||
                     process.env.DATABASE_URL ||
                     process.env.DB_URI;

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    console.log(DRY_RUN
      ? '🔍 DRY RUN — no changes will be saved\n'
      : '💾 LIVE RUN — changes will be saved\n'
    );

    // 1. Load the quest
    const quest = await Quest.findById(QUEST_ID);
    if (!quest) {
      console.error(`❌ Quest not found with ID: ${QUEST_ID}`);
      process.exit(1);
    }

    console.log(`🎯 Quest       : "${quest.title}"`);
    console.log(`   Type        : ${quest.questType}`);
    console.log(`   XP per join : ${XP_PER_JOIN} (manual override)`);
    console.log(`   XP per done : ${XP_PER_COMPLETE} (manual override)`);
    console.log(`   DB referral enabled: ${quest.referralConfig?.enabled ? 'YES' : 'NO ← will be patched'}`);
    console.log('\n═══════════════════════════════════════════════════════\n');

    // 2. Patch the quest's referralConfig in DB so future referrals work too
    if (!DRY_RUN) {
      quest.questType = 'referral_boost';
      quest.referralConfig = {
        enabled:              true,
        xpPerReferralJoin:    XP_PER_JOIN,
        xpPerReferralComplete: XP_PER_COMPLETE
      };
      await quest.save();
      console.log('🔧 Quest referralConfig patched in DB — future referrals will now work\n');
    } else {
      console.log('🔧 [DRY RUN] Would patch quest referralConfig in DB\n');
    }

    // ── COUNTERS ──────────────────────────────────────────────
    let totalReferrersFixed  = 0;
    let totalGlobalXpAwarded = 0;
    let totalSkipped         = 0;
    let alreadyOkCount       = 0;

    // 3. Get ALL participants for this quest
    const allProgressEntries = await UserQuestProgress.find({
      questId: QUEST_ID,
      status: { $in: ['in_progress', 'completed'] }
    }).populate('userId', '_id username referredBy');

    console.log(`📋 Found ${allProgressEntries.length} participants on this quest\n`);

    for (const referredProgress of allProgressEntries) {
      const referredUser = referredProgress.userId;

      // Skip deleted users or users with no referredBy
      if (!referredUser)             { totalSkipped++; continue; }
      if (!referredUser.referredBy)  { continue; }

      // 4. Find the referrer by their referralCode
      const referrer = await User.findOne({ referralCode: referredUser.referredBy });
      if (!referrer) {
        console.log(`⚠️  No referrer found for code "${referredUser.referredBy}" (user: ${referredUser.username}) — skipping`);
        totalSkipped++;
        continue;
      }

      // 5. Get referrer's progress on this quest
      const referrerProgress = await UserQuestProgress.findOne({
        userId:  referrer._id,
        questId: QUEST_ID
      });

      let xpToAdd = 0;

      // ── JOIN BONUS ──────────────────────────────────────────
      if (XP_PER_JOIN > 0) {
        if (referrerProgress) {
          const alreadyCounted = referrerProgress.referralStats.referralsJoined.some(
            r => r.userId.toString() === referredUser._id.toString()
          );

          if (!alreadyCounted) {
            console.log(`  ➕ JOIN bonus   : ${referrer.username} ← ${referredUser.username} (+${XP_PER_JOIN} XP)`);
            xpToAdd += XP_PER_JOIN;

            if (!DRY_RUN) {
              referrerProgress.referralStats.referralsJoined.push({
                userId:   referredUser._id,
                joinedAt: referredProgress.startedAt || new Date(),
                xpEarned: XP_PER_JOIN
              });
            }
          } else {
            console.log(`  ✔️  JOIN already counted : ${referrer.username} ← ${referredUser.username}`);
            alreadyOkCount++;
          }
        } else {
          // Referrer hasn't started the quest — global XP only
          console.log(`  ➕ JOIN bonus (global only): ${referrer.username} ← ${referredUser.username} (+${XP_PER_JOIN} XP)`);
          xpToAdd += XP_PER_JOIN;
        }
      }

      // ── COMPLETE BONUS ──────────────────────────────────────
      if (XP_PER_COMPLETE > 0 && referredProgress.status === 'completed') {
        if (referrerProgress) {
          const alreadyCounted = referrerProgress.referralStats.referralsCompleted.some(
            r => r.userId.toString() === referredUser._id.toString()
          );

          if (!alreadyCounted) {
            console.log(`  🏆 COMPLETE bonus: ${referrer.username} ← ${referredUser.username} (+${XP_PER_COMPLETE} XP)`);
            xpToAdd += XP_PER_COMPLETE;

            if (!DRY_RUN) {
              referrerProgress.referralStats.referralsCompleted.push({
                userId:      referredUser._id,
                completedAt: referredProgress.completedAt || new Date(),
                xpEarned:    XP_PER_COMPLETE
              });
            }
          } else {
            console.log(`  ✔️  COMPLETE already counted: ${referrer.username} ← ${referredUser.username}`);
            alreadyOkCount++;
          }
        } else {
          console.log(`  🏆 COMPLETE bonus (global only): ${referrer.username} ← ${referredUser.username} (+${XP_PER_COMPLETE} XP)`);
          xpToAdd += XP_PER_COMPLETE;
        }
      }

      // 6. Save quest-level XP on referrer's progress
      if (!DRY_RUN && referrerProgress && xpToAdd > 0) {
        referrerProgress.calculateReferralXp();
        referrerProgress.markModified('xpBreakdown');
        referrerProgress.markModified('referralStats');
        await referrerProgress.save();
      }

      // 7. Save global XP on referrer's User document
      if (xpToAdd > 0) {
        if (!DRY_RUN) {
          referrer.xp = (referrer.xp || 0) + xpToAdd;
          referrer.recentActivity = referrer.recentActivity || [];
          referrer.recentActivity.unshift({
            action:    `[Repair] Referral XP for "${quest.title}" (+${xpToAdd} XP)`,
            timestamp: new Date()
          });
          if (referrer.recentActivity.length > 10) {
            referrer.recentActivity = referrer.recentActivity.slice(0, 10);
          }
          await referrer.save();
          totalGlobalXpAwarded += xpToAdd;
        }

        totalReferrersFixed++;
        console.log(`  💰 ${referrer.username} gets +${xpToAdd} XP total\n`);
      }
    }

    // ── SUMMARY ───────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 REPAIR SUMMARY');
    console.log(`   Quest              : ${quest.title}`);
    console.log(`   Participants       : ${allProgressEntries.length}`);
    console.log(`   Referrers fixed    : ${totalReferrersFixed}`);
    console.log(`   Already correct    : ${alreadyOkCount}`);
    console.log(`   Skipped            : ${totalSkipped}`);
    if (!DRY_RUN) {
      console.log(`   Global XP added    : ${totalGlobalXpAwarded}`);
    }
    console.log(DRY_RUN
      ? '\n⚠️  DRY RUN complete — run without --dry-run to apply fixes'
      : '\n✅ All fixes applied successfully'
    );
    console.log('═══════════════════════════════════════════════════════');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

repairReferralXp();