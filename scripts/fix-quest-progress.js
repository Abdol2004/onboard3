const mongoose = require('mongoose');
const User = require('../models/User');
const Quest = require('../models/Quest');
const UserQuestProgress = require('../models/UserQuestProgress');
require('dotenv').config();

async function backfillReferralRewards() {
  try {
    const mongoUri = process.env.MONGODB_URI ||
                     process.env.MONGO_URI ||
                     process.env.DATABASE_URL ||
                     process.env.DB_URI;

    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in environment variables!');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all quests with referral config enabled
    const quests = await Quest.find({
      'referralConfig.enabled': true
    });

    console.log(`\n📋 Found ${quests.length} quests with referral rewards enabled\n`);

    let totalJoinBonusesAwarded = 0;
    let totalCompleteBonusesAwarded = 0;
    let totalXpAwarded = 0;
    let skippedNoReferral = 0;

    for (const quest of quests) {
      console.log(`\n🎯 Processing: ${quest.title}`);
      console.log(`   Join Bonus: ${quest.referralConfig.xpPerReferralJoin} XP`);
      console.log(`   Complete Bonus: ${quest.referralConfig.xpPerReferralComplete} XP`);

      const allProgress = await UserQuestProgress.find({
        questId: quest._id
      }).populate('userId');

      console.log(`   Participants: ${allProgress.length}`);

      for (const progress of allProgress) {
        const user = progress.userId;

        if (!user || !user.referredBy) { skippedNoReferral++; continue; }

        const referrer = await User.findOne({ referralCode: user.referredBy });
        if (!referrer) continue;

        let referrerProgress = await UserQuestProgress.findOne({
          userId: referrer._id,
          questId: quest._id
        });

        // ========== JOIN BONUS ==========
        if (quest.referralConfig.xpPerReferralJoin > 0) {
          const alreadyCountedJoin = referrerProgress
            ? referrerProgress.referralStats.referralsJoined.some(r => r.userId.toString() === user._id.toString())
            : false;

          if (!alreadyCountedJoin) {
            // Update quest-level stats only if referrer has started the quest
            if (referrerProgress) {
              referrerProgress.referralStats.referralsJoined.push({
                userId: user._id,
                joinedAt: progress.startedAt || new Date(),
                xpEarned: quest.referralConfig.xpPerReferralJoin
              });
            }

            // Always award global XP
            referrer.xp += quest.referralConfig.xpPerReferralJoin;
            totalXpAwarded += quest.referralConfig.xpPerReferralJoin;
            totalJoinBonusesAwarded++;

            const note = referrerProgress ? '' : ' (global XP only - referrer had no quest progress)';
            console.log(`   ✅ Join: ${referrer.username} +${quest.referralConfig.xpPerReferralJoin} XP for ${user.username}${note}`);
          }
        }

        // ========== COMPLETE BONUS ==========
        if (progress.status === 'completed' && quest.referralConfig.xpPerReferralComplete > 0) {
          const alreadyCountedComplete = referrerProgress
            ? referrerProgress.referralStats.referralsCompleted.some(r => r.userId.toString() === user._id.toString())
            : false;

          if (!alreadyCountedComplete) {
            if (referrerProgress) {
              referrerProgress.referralStats.referralsCompleted.push({
                userId: user._id,
                completedAt: progress.completedAt || new Date(),
                xpEarned: quest.referralConfig.xpPerReferralComplete
              });
            }

            referrer.xp += quest.referralConfig.xpPerReferralComplete;
            totalXpAwarded += quest.referralConfig.xpPerReferralComplete;
            totalCompleteBonusesAwarded++;

            const note = referrerProgress ? '' : ' (global XP only - referrer had no quest progress)';
            console.log(`   ✅ Complete: ${referrer.username} +${quest.referralConfig.xpPerReferralComplete} XP for ${user.username}${note}`);
          }
        }

        // Save referrer progress if it exists
        if (referrerProgress) {
          referrerProgress.calculateReferralXp();
          referrerProgress.markModified('xpBreakdown');
          referrerProgress.markModified('referralStats');
          await referrerProgress.save();
        }

        await referrer.save();
      }
    }

    console.log('\n\n🎉 BACKFILL COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Join Bonuses: ${totalJoinBonusesAwarded}`);
    console.log(`✅ Complete Bonuses: ${totalCompleteBonusesAwarded}`);
    console.log(`✅ Total XP Awarded: ${totalXpAwarded}`);
    console.log(`⏭️  Skipped (no referral code): ${skippedNoReferral}`);
    console.log('═══════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

backfillReferralRewards();
