// sendQuestReminder.js
require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('./models/User'); // Adjust path to your User model

// MongoDB Connection
const MONGODB_URI = 'e=Cluster0';
const baseUrl = process.env.BASE_URL || "https://onboard3.app";

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
   user: 'onboardweb3ng@gmail.com', // Your Gmail address
    pass: 'sotf xvne tudu jsey' // Your Gmail App Password
  }
});

// Quest Reminder Email Template
const getQuestReminderHTML = (username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #0a0a0a;
          color: #ffffff;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        }
        .header {
          background: linear-gradient(135deg, #39FF14 0%, #2dd10d 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #0a0a0a;
          font-size: 32px;
          font-weight: bold;
        }
        .emoji-large {
          font-size: 60px;
          margin: 10px 0;
        }
        .content {
          padding: 40px 30px;
          background: #0a0a0a;
        }
        .reward-box {
          background: linear-gradient(135deg, rgba(57, 255, 20, 0.2) 0%, rgba(57, 255, 20, 0.05) 100%);
          border: 2px solid #39FF14;
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
        }
        .reward-amount {
          font-size: 48px;
          font-weight: bold;
          color: #39FF14;
          margin: 10px 0;
        }
        .action-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(57, 255, 20, 0.3);
          border-radius: 10px;
          padding: 25px;
          margin: 20px 0;
          transition: all 0.3s;
        }
        .action-number {
          display: inline-block;
          background: #39FF14;
          color: #0a0a0a;
          width: 40px;
          height: 40px;
          line-height: 40px;
          border-radius: 50%;
          font-weight: bold;
          font-size: 20px;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          background: #39FF14;
          color: #0a0a0a;
          text-decoration: none;
          padding: 16px 40px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 18px;
          margin: 15px 10px;
        }
        .button-secondary {
          background: transparent;
          border: 2px solid #39FF14;
          color: #39FF14;
        }
        .urgency-box {
          background: rgba(255, 69, 0, 0.1);
          border: 1px solid rgba(255, 69, 0, 0.5);
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .urgency-text {
          color: #ff6b6b;
          font-weight: bold;
          font-size: 16px;
        }
        .benefits-list {
          list-style: none;
          padding: 0;
        }
        .benefits-list li {
          padding: 12px 0;
          border-bottom: 1px solid rgba(57, 255, 20, 0.1);
          color: #ccc;
        }
        .benefits-list li:before {
          content: "✓";
          color: #39FF14;
          font-weight: bold;
          margin-right: 10px;
          font-size: 18px;
        }
        .footer {
          background: #0a0a0a;
          padding: 30px;
          text-align: center;
          color: #888;
          font-size: 12px;
          border-top: 1px solid rgba(57, 255, 20, 0.2);
        }
        .social-links {
          margin: 20px 0;
        }
        .social-links a {
          color: #39FF14;
          text-decoration: none;
          margin: 0 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji-large">💰</div>
          <h1>Don't Miss Out!</h1>
          <p style="color: #0a0a0a; font-size: 18px; margin: 10px 0 0 0;">Complete Your Quests & Earn Rewards</p>
        </div>
        
        <div class="content">
          <h2 style="color: #39FF14; font-size: 26px;">Hey ${username}! 👋</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
            We noticed you haven't completed all your quests yet! There's still time to claim your share of our rewards pool.
          </p>

          <div class="reward-box">
            <h3 style="color: #39FF14; margin: 0 0 10px 0; font-size: 22px;">🎁 REWARD POOL</h3>
            <div class="reward-amount">$1,000</div>
            <p style="color: #ccc; margin: 10px 0 0 0; font-size: 16px;">Available for Active Participants</p>
          </div>

          <div class="urgency-box">
            <p class="urgency-text">⏰ TIME IS RUNNING OUT! Complete your tasks now to qualify for rewards.</p>
          </div>

          <h3 style="color: #39FF14; font-size: 24px; margin-top: 40px;">🎯 3 Simple Actions to Take:</h3>

          <div class="action-card">
            <div class="action-number">1</div>
            <h4 style="color: #39FF14; margin: 10px 0; font-size: 20px;">✅ Complete All Quest Tasks</h4>
            <p style="color: #ccc; line-height: 1.6;">
              Finish all pending quest tasks to maximize your rewards. Each completed quest increases your share of the $1,000 pool!
            </p>
            <center>
              <a href="${baseUrl}/dashboard/quests" class="button">View My Quests →</a>
            </center>
          </div>

          <div class="action-card">
            <div class="action-number">2</div>
            <h4 style="color: #39FF14; margin: 10px 0; font-size: 20px;">👥 Boost Your Followers</h4>
            <p style="color: #ccc; line-height: 1.6;">
              Grow your network on ONBOARD3! More followers means more visibility, collaboration opportunities, and potential rewards.
            </p>
            <ul class="benefits-list">
              <li>Connect with fellow Web3 builders</li>
              <li>Showcase your achievements</li>
              <li>Unlock exclusive community perks</li>
            </ul>
            <center>
              <a href="${baseUrl}/dashboard/profile" class="button">Boost My Profile →</a>
            </center>
          </div>

          <div class="action-card">
            <div class="action-number">3</div>
            <h4 style="color: #39FF14; margin: 10px 0; font-size: 20px;">🎓 Apply for Free Courses</h4>
            <p style="color: #ccc; line-height: 1.6;">
              Level up your Web3 skills with our expert-led courses. Limited spots available - don't miss your chance to learn from the best!
            </p>
            <ul class="benefits-list">
              <li>Free access to premium Web3 courses</li>
              <li>Learn from industry experts</li>
              <li>Get certified and boost your career</li>
              <li>Join exclusive course communities</li>
            </ul>
            <center>
              <a href="${baseUrl}/dashboard/courses" class="button">Browse Courses →</a>
            </center>
          </div>

          <div style="background: rgba(57, 255, 20, 0.05); border-radius: 12px; padding: 30px; margin: 40px 0; text-align: center;">
            <h3 style="color: #39FF14; margin-top: 0;">🚀 Ready to Take Action?</h3>
            <p style="color: #ccc; font-size: 16px; margin-bottom: 25px;">
              Complete these tasks today and maximize your rewards!
            </p>
            <a href="${baseUrl}/dashboard" class="button" style="margin: 5px;">Go to Dashboard</a>
            <a href="${baseUrl}/dashboard/quests" class="button button-secondary" style="margin: 5px;">View Quests</a>
          </div>

          <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
            Questions? Our support team is here to help! Reply to this email or visit our help center.
          </p>
        </div>
        
        <div class="footer">
          <p style="font-size: 16px; color: #39FF14; margin-bottom: 10px;"><strong>ONBOARD3</strong></p>
          <p>Onboard. Educate. Build.</p>
          <div class="social-links">
            <a href="https://twitter.com/onboard3___">Twitter</a> | 
            <a href="https://t.me/onboard_3">Telegram</a> | 
            <a href="${baseUrl}">Website</a>
          </div>
          <p style="margin-top: 20px; font-size: 11px;">
            You're receiving this email because you're a registered member of ONBOARD3.<br>
            <a href="${baseUrl}/settings/notifications" style="color: #39FF14;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Plain text version for better deliverability
const getQuestReminderText = (username) => {
  return `
Hey ${username}!

💰 DON'T MISS OUT - $1,000 REWARD POOL AVAILABLE!

We noticed you haven't completed all your quests yet. There's still time to claim your share of our rewards pool!

🎯 3 SIMPLE ACTIONS TO TAKE:

1. ✅ COMPLETE ALL QUEST TASKS
   Finish all pending quest tasks to maximize your rewards.
   View your quests: ${baseUrl}/dashboard/quests

2. 👥 BOOST YOUR FOLLOWERS
   Grow your network on ONBOARD3! Connect with fellow Web3 builders and unlock exclusive perks.
   Boost your profile: ${baseUrl}/dashboard/

3. 🎓 APPLY FOR FREE COURSES
   Level up your Web3 skills with our expert-led courses. Limited spots available!
   Browse courses: ${baseUrl}/dashboard/learn

⏰ TIME IS RUNNING OUT! Complete these tasks today to qualify for rewards.

Go to your dashboard: ${baseUrl}/dashboard

Questions? Reply to this email - our support team is here to help!

---
ONBOARD3 - Onboard. Educate. Build.
${baseUrl}
  `.trim();
};

// Function to send email with retry logic
async function sendEmail(user, retries = 3) {
  const mailOptions = {
    from: `"ONBOARD3" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: '💰 Don\'t Miss Out! Complete Quests & Earn Your Share of $1K',
    html: getQuestReminderHTML(user.username),
    text: getQuestReminderText(user.username)
  };

  for (let i = 0; i < retries; i++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, email: user.email, messageId: info.messageId };
    } catch (error) {
      if (i === retries - 1) {
        return { success: false, email: user.email, error: error.message };
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Main function
async function sendQuestReminderToAllUsers() {
  try {
    console.log('🚀 Starting Quest Reminder Email Campaign...\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users (you can add filters if needed)
    console.log('Fetching all users...');
    const users = await User.find()
      .select('email username createdAt')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('No users found to send emails to.');
      process.exit(0);
    }

    // Ask for confirmation before sending to all users
    console.log('⚠️  WARNING: This will send emails to ALL users!');
    console.log(`📧 Total emails to send: ${users.length}\n`);
    
    // Send emails with rate limiting
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    console.log('📤 Starting to send emails...\n');
    const startTime = Date.now();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Progress indicator
      const progress = ((i + 1) / users.length * 100).toFixed(1);
      console.log(`[${i + 1}/${users.length}] (${progress}%) Sending to ${user.email}...`);
      
      const result = await sendEmail(user);
      
      if (result.success) {
        results.success++;
        console.log(`  ✅ Sent successfully (ID: ${result.messageId})`);
      } else {
        results.failed++;
        results.errors.push({ email: result.email, error: result.error });
        console.log(`  ❌ Failed: ${result.error}`);
      }

      // Rate limiting: Wait 1 second between emails
      // Gmail allows ~100-500 emails/day depending on account age
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL CAMPAIGN SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users:        ${users.length}`);
    console.log(`✅ Successfully sent: ${results.success}`);
    console.log(`❌ Failed:           ${results.failed}`);
    console.log(`⏱️  Duration:         ${duration} minutes`);
    console.log(`📈 Success rate:     ${(results.success / users.length * 100).toFixed(1)}%`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ FAILED EMAILS:');
      console.log('='.repeat(60));
      results.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.email}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    console.log('\n✨ Campaign completed! ✨\n');

  } catch (error) {
    console.error('💥 Fatal Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

// Run the script
sendQuestReminderToAllUsers();