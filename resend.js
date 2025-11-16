// Create: bulk-verify.js
// This manually verifies ALL unverified users + processes referral rewards

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { sendWelcomeEmail } = require('./utils/emailService');

async function bulkVerifyUsers() {
  try {
    await mongoose.connect('mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("✅ Connected to database\n");

    // Get all unverified users
    const unverifiedUsers = await User.find({ isVerified: false })
      .select('username email referredBy referralRewardGiven')
      .sort({ createdAt: 1 });

    console.log(`📊 Found ${unverifiedUsers.length} unverified users`);
    console.log(`🔧 Starting bulk verification...\n`);

    let verifiedCount = 0;
    let referralCount = 0;
    let welcomeEmailCount = 0;
    let errors = [];

    for (let i = 0; i < unverifiedUsers.length; i++) {
      const user = unverifiedUsers[i];
      
      console.log(`[${i + 1}/${unverifiedUsers.length}] ${user.username} (${user.email})`);

      try {
        // 1. Verify the user
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;

        // 2. Process referral reward if applicable
        if (user.referredBy && !user.referralRewardGiven) {
          try {
            const referrer = await User.findOne({ referralCode: user.referredBy });
            
            if (referrer) {
              // Initialize referralStats if not exists
              if (!referrer.referralStats) {
                referrer.referralStats = {
                  totalReferrals: 0,
                  activeReferrals: 0,
                  pendingReferrals: 0,
                  totalEarned: 0
                };
              }

              // Update referrer stats
              const signupBonus = 50;
              referrer.referralStats.totalReferrals += 1;
              referrer.referralStats.activeReferrals += 1;
              referrer.xp += signupBonus;
              referrer.referralStats.totalEarned += signupBonus;

              // Add activity
              referrer.recentActivity = referrer.recentActivity || [];
              referrer.recentActivity.unshift({
                action: `Referral verified: ${user.username} - Earned ${signupBonus} XP 🎉`,
                timestamp: new Date()
              });

              // Keep only last 10 activities
              if (referrer.recentActivity.length > 10) {
                referrer.recentActivity = referrer.recentActivity.slice(0, 10);
              }

              await referrer.save();

              // Mark reward as given
              user.referralRewardGiven = true;
              
              console.log(`  💰 Referral reward: ${referrer.username} +${signupBonus} XP`);
              referralCount++;
            }
          } catch (refError) {
            console.log(`  ⚠️  Referral processing failed: ${refError.message}`);
          }
        }

        // 3. Save user
        await user.save();
        verifiedCount++;
        console.log(`  ✅ Verified!`);

        // 4. Try to send welcome email (optional, won't block if fails)
        try {
          const emailResult = await sendWelcomeEmail(user.email, user.username);
          if (emailResult.success) {
            welcomeEmailCount++;
            console.log(`  📧 Welcome email sent`);
          }
        } catch (emailError) {
          // Don't fail if email doesn't send
          console.log(`  ⚠️  Welcome email skipped`);
        }

        // Small delay every 10 users to avoid overwhelming the system
        if ((i + 1) % 10 === 0) {
          console.log(`  ⏸️  Checkpoint: ${i + 1}/${unverifiedUsers.length} processed\n`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors.push({ user: user.username, error: error.message });
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 BULK VERIFICATION COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Users verified: ${verifiedCount}/${unverifiedUsers.length}`);
    console.log(`💰 Referral rewards processed: ${referralCount}`);
    console.log(`📧 Welcome emails sent: ${welcomeEmailCount}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.forEach(e => console.log(`   - ${e.user}: ${e.error}`));
    }

    console.log(`\n✅ All users can now login without verification!`);
    console.log(`🔗 They can access: ${process.env.BASE_URL || 'https://onboard3.app'}`);

    await mongoose.connection.close();
    console.log(`\n✅ Database connection closed`);

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Confirmation prompt
console.log(`
⚠️  WARNING: This will manually verify ALL unverified users!
   - They will be able to login immediately
   - Referral rewards will be processed
   - Welcome emails will be sent (optional)
   
🔍 Preview: This will affect approximately 256 users

Press Ctrl+C to cancel, or wait 5 seconds to continue...
`);

setTimeout(() => {
  console.log("\n🚀 Starting bulk verification...\n");
  bulkVerifyUsers();
}, 5000);