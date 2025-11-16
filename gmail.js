// Create: resend-gmail-only.js
// This sends ONLY to Gmail users in small batches to "warm up"

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./utils/emailService');

// ✅ Use resend.dev domain
process.env.FROM_EMAIL = 'onboarding@resend.dev';

// ✅ Gmail Warmup Schedule
const WARMUP_SCHEDULE = [
  { day: 1, limit: 10, delay: 120000 },   // Day 1: 10 emails, 2 min between each
  { day: 2, limit: 20, delay: 90000 },    // Day 2: 20 emails, 1.5 min between
  { day: 3, limit: 50, delay: 60000 },    // Day 3: 50 emails, 1 min between
  { day: 4, limit: 100, delay: 45000 },   // Day 4: 100 emails, 45s between
  { day: 5, limit: 256, delay: 30000 },   // Day 5+: All remaining, 30s between
];

async function warmupGmailSending(day = 1) {
  try {
    await mongoose.connect('mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("✅ Connected to database");

    const schedule = WARMUP_SCHEDULE.find(s => s.day === day) || WARMUP_SCHEDULE[WARMUP_SCHEDULE.length - 1];
    
    // Find unverified Gmail users only
    const gmailUsers = await User.find({ 
      isVerified: false,
      email: { $regex: /@gmail\.com$/i }
    })
    .select('email username verificationToken verificationTokenExpires')
    .sort({ createdAt: 1 }) // Oldest first
    .limit(schedule.limit);

    console.log(`\n🎯 GMAIL WARMUP - DAY ${day}`);
    console.log(`📊 Found ${gmailUsers.length} unverified Gmail users`);
    console.log(`📧 Will send: ${Math.min(gmailUsers.length, schedule.limit)} emails`);
    console.log(`⏰ Delay between emails: ${schedule.delay / 1000} seconds`);
    console.log(`🔑 Using: ${process.env.FROM_EMAIL}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < Math.min(gmailUsers.length, schedule.limit); i++) {
      const user = gmailUsers[i];
      
      console.log(`[${i + 1}/${gmailUsers.length}] ${user.email}`);

      // Regenerate token if expired
      if (!user.verificationToken || new Date(user.verificationTokenExpires) < new Date()) {
        user.verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();
      }

      // Send email
      try {
        const result = await sendVerificationEmail(user.email, user.username, user.verificationToken);
        
        if (result.success) {
          console.log(`  ✅ Sent | ID: ${result.data?.id}`);
          successCount++;
        } else {
          console.log(`  ❌ Failed: ${result.error}`);
          failCount++;
        }

        // Wait before next email (critical for Gmail!)
        if (i < gmailUsers.length - 1) {
          const waitSeconds = schedule.delay / 1000;
          console.log(`  ⏸️  Waiting ${waitSeconds}s...\n`);
          await new Promise(resolve => setTimeout(resolve, schedule.delay));
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 DAY ${day} SUMMARY:`);
    console.log(`✅ Sent: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📧 Total processed: ${successCount + failCount}`);
    
    const remainingGmail = await User.countDocuments({ 
      isVerified: false,
      email: { $regex: /@gmail\.com$/i }
    });
    
    console.log(`\n📬 Remaining Gmail users: ${remainingGmail}`);
    
    if (remainingGmail > 0 && day < 5) {
      console.log(`\n💡 Run this again tomorrow with: node resend-gmail-only.js ${day + 1}`);
    } else if (remainingGmail > 0) {
      console.log(`\n💡 Continue sending: node resend-gmail-only.js 5`);
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Get day from command line argument: node resend-gmail-only.js 2
const day = parseInt(process.argv[2]) || 1;
warmupGmailSending(day);