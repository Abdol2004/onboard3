// services/gmailSmtpService.js
const nodemailer = require('nodemailer');
const User = require('./models/User');

// ✅ LOCALHOST CHECK - Only run on local development
const IS_LOCALHOST = process.env.NODE_ENV !== 'production' && 
                     (process.env.USE_GMAIL_SMTP === 'true');

let transporter = null;
let isServiceRunning = false;

/**
 * Initialize Gmail SMTP transporter
 */
const initializeTransporter = () => {
  if (!IS_LOCALHOST) {
    console.log('📧 Gmail SMTP Service: Disabled (not localhost or production mode)');
    return null;
  }

  console.log('📧 Initializing Gmail SMTP Service for localhost...');

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD // App-specific password (not regular password!)
    },
    pool: true, // Use pooled connections
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10 // Max 10 emails per second
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Gmail SMTP verification failed:', error);
    } else {
      console.log('✅ Gmail SMTP Server is ready to send emails');
    }
  });

  return transporter;
};

/**
 * Send verification email
 */
const sendVerificationEmail = async (email, username, token) => {
  if (!transporter) {
    throw new Error('SMTP transporter not initialized');
  }

  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: {
      name: 'ONBOARD3',
      address: process.env.GMAIL_USER
    },
    to: email,
    subject: '🚀 Verify Your ONBOARD3 Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .header {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            text-align: center;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }
          .header h1 {
            color: #fff;
            margin: 0;
            font-size: 32px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }
          .content { 
            padding: 40px 30px; 
            background: #fff;
          }
          .welcome {
            font-size: 24px;
            color: #667eea;
            margin-bottom: 20px;
            font-weight: bold;
          }
          .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button { 
            display: inline-block;
            padding: 15px 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important; 
            text-decoration: none; 
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.3s, box-shadow 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
            color: #999;
            background: #f9f9f9;
            border-top: 1px solid #e0e0e0;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #667eea, transparent);
            margin: 20px 0;
          }
          .info-box {
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 ONBOARD3</h1>
          </div>
          
          <div class="content">
            <div class="welcome">Welcome, ${username}! 👋</div>
            
            <div class="message">
              Thank you for joining ONBOARD3! We're excited to have you on board.
              To get started, please verify your email address by clicking the button below.
            </div>
            
            <div class="button-container">
              <a href="${verificationUrl}" class="button">
                ✓ Verify My Email
              </a>
            </div>
            
            <div class="divider"></div>
            
            <div class="info-box">
              <strong>⏰ This link expires in 24 hours</strong><br>
              If you didn't create this account, please ignore this email.
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>© 2024 ONBOARD3. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, username) => {
  if (!transporter) {
    throw new Error('SMTP transporter not initialized');
  }

  const loginUrl = `${process.env.BASE_URL}/login`;

  const mailOptions = {
    from: {
      name: 'ONBOARD3',
      address: process.env.GMAIL_USER
    },
    to: email,
    subject: '🎉 Welcome to ONBOARD3!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .header {
            background: rgba(255,255,255,0.1);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }
          .header h1 {
            color: #fff;
            margin: 0;
            font-size: 36px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }
          .emoji {
            font-size: 60px;
            margin-bottom: 10px;
          }
          .content { 
            padding: 40px 30px; 
            background: #fff;
          }
          .welcome {
            font-size: 28px;
            color: #11998e;
            margin-bottom: 20px;
            font-weight: bold;
            text-align: center;
          }
          .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 25px;
          }
          .feature-box {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            margin: 15px 0;
            border-radius: 10px;
            border-left: 4px solid #11998e;
          }
          .feature-box h3 {
            color: #11998e;
            margin-top: 0;
            font-size: 18px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button { 
            display: inline-block;
            padding: 15px 40px; 
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white !important; 
            text-decoration: none; 
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.3s, box-shadow 0.3s;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(17, 153, 142, 0.6);
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
            color: #999;
            background: #f9f9f9;
            border-top: 1px solid #e0e0e0;
          }
          .footer a {
            color: #11998e;
            text-decoration: none;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
          }
          .stat-item {
            text-align: center;
          }
          .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #11998e;
          }
          .stat-label {
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎉</div>
            <h1>Account Verified!</h1>
          </div>
          
          <div class="content">
            <div class="welcome">Welcome aboard, ${username}! 🚀</div>
            
            <div class="message">
              Your email has been successfully verified and your account is now active!
              You're all set to explore everything ONBOARD3 has to offer.
            </div>
            
            <div class="feature-box">
              <h3>🎯 What's Next?</h3>
              <p>✓ Complete your profile<br>
              ✓ Explore available features<br>
              ✓ Earn XP and rewards<br>
              ✓ Refer friends and get bonuses</p>
            </div>
            
            <div class="feature-box">
              <h3>💡 Pro Tip</h3>
              <p>Share your referral code with friends to earn bonus XP when they join!</p>
            </div>
            
            <div class="button-container">
              <a href="${loginUrl}" class="button">
                🚀 Get Started Now
              </a>
            </div>
            
            <div class="stats">
              <div class="stat-item">
                <div class="stat-number">0</div>
                <div class="stat-label">XP Points</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">0</div>
                <div class="stat-label">Referrals</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">∞</div>
                <div class="stat-label">Possibilities</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2024 ONBOARD3. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Process pending verification emails (runs every 3 seconds)
 */
const processPendingEmails = async () => {
  if (!IS_LOCALHOST || !transporter) {
    return;
  }

  try {
    // Find users who need verification emails sent
    const pendingUsers = await User.find({
      isVerified: false,
      verificationToken: { $exists: true, $ne: null },
      emailSent: { $ne: true }, // Custom flag to track if email was sent
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Only last 24h
    }).limit(5); // Process 5 at a time to avoid overwhelming

    if (pendingUsers.length > 0) {
      console.log(`📧 Processing ${pendingUsers.length} pending verification emails...`);
    }

    for (const user of pendingUsers) {
      try {
        await sendVerificationEmail(user.email, user.username, user.verificationToken);
        
        // Mark email as sent
        user.emailSent = true;
        await user.save();
        
        console.log(`✅ Verification email sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${user.email}:`, error.message);
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Process welcome emails for newly verified users
    const newlyVerified = await User.find({
      isVerified: true,
      welcomeEmailSent: { $ne: true }, // Custom flag for welcome emails
      verificationToken: null
    }).limit(5);

    for (const user of newlyVerified) {
      try {
        await sendWelcomeEmail(user.email, user.username);
        
        // Mark welcome email as sent
        user.welcomeEmailSent = true;
        await user.save();
        
        console.log(`✅ Welcome email sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send welcome email to ${user.email}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    console.error('❌ Error processing pending emails:', error);
  }
};

/**
 * Start the email service
 */
const startEmailService = () => {
  if (!IS_LOCALHOST) {
    console.log('📧 Gmail SMTP Service: Not starting (production mode or disabled)');
    return;
  }

  if (isServiceRunning) {
    console.log('📧 Gmail SMTP Service already running');
    return;
  }

  console.log('📧 Starting Gmail SMTP Service...');
  
  // Initialize transporter
  initializeTransporter();

  if (!transporter) {
    console.error('❌ Failed to initialize SMTP transporter');
    return;
  }

  // Start processing emails every 3 seconds
  const emailInterval = setInterval(processPendingEmails, 3000);
  isServiceRunning = true;

  console.log('✅ Gmail SMTP Service started - processing every 3 seconds');

  // Cleanup on process exit
  process.on('SIGINT', () => {
    console.log('📧 Stopping Gmail SMTP Service...');
    clearInterval(emailInterval);
    if (transporter) {
      transporter.close();
    }
    process.exit(0);
  });

  return emailInterval;
};

/**
 * Stop the email service
 */
const stopEmailService = () => {
  isServiceRunning = false;
  if (transporter) {
    transporter.close();
  }
  console.log('📧 Gmail SMTP Service stopped');
};

module.exports = {
  startEmailService,
  stopEmailService,
  sendVerificationEmail,
  sendWelcomeEmail,
  IS_LOCALHOST
};