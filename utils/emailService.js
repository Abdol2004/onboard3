// utils/emailService.js - COMPLETE EMAIL SERVICE

const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

// Initialize transporter
const getTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  // Check which email service to use
  if (process.env.EMAIL_SERVICE === 'gmail') {
    // Gmail with App Password
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
        port: 587, // SSL port
        secure: false
      }
    });
    console.log('📧 Email service: Gmail');
  } 
  else if (process.env.SMTP_HOST) {
    // Custom SMTP (works with any provider)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    console.log('📧 Email service: Custom SMTP');
  }
  else {
    // Ethereal for testing (creates temporary account)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('📧 Email service: Ethereal (TEST MODE)');
    console.log('📧 Test account:', testAccount.user);
  }

  return transporter;
};

// Send verification email
exports.sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const transporter = await getTransporter();
    const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"ONBOARD3" <${process.env.EMAIL_USER || 'noreply@onboard3.com'}>`,
      to: email,
      subject: '🎉 Welcome to ONBOARD3 - Verify Your Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 2px solid #39FF14; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, rgba(57,255,20,0.2) 0%, rgba(57,255,20,0.05) 100%); padding: 40px 20px; text-align: center; }
            .logo { color: #39FF14; font-size: 32px; font-weight: 700; margin-bottom: 10px; }
            .header h1 { color: #39FF14; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .content p { line-height: 1.8; color: #ccc; font-size: 16px; margin: 15px 0; }
            .button { display: inline-block; background: #39FF14; color: #0a0a0a; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 25px 0; font-size: 18px; }
            .footer { background: #0a0a0a; padding: 25px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #39FF14; }
            .highlight { color: #39FF14; font-weight: 600; }
            .link-box { background: rgba(57,255,20,0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(57,255,20,0.3); margin: 20px 0; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
              <h1>Welcome to Web3! 🚀</h1>
            </div>
            <div class="content">
              <p>Hey <span class="highlight">${username}</span>,</p>
              <p>Welcome to <strong>ONBOARD3</strong> - Your gateway to Web3 development! We're excited to have you join our community of builders.</p>
              <p>To get started and unlock all features, please verify your email address:</p>
              <center>
                <a href="${verificationLink}" class="button">✓ Verify Email Address</a>
              </center>
              <p style="font-size: 14px; color: #888; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <div class="link-box">
                <a href="${verificationLink}" style="color: #39FF14; text-decoration: none;">${verificationLink}</a>
              </div>
              <p style="font-size: 14px; color: #888;">
                ⏰ This link will expire in <strong>24 hours</strong>.
              </p>
            </div>
            <div class="footer">
              <p>If you didn't create this account, please ignore this email.</p>
              <p>© ${new Date().getFullYear()} ONBOARD3. All rights reserved.</p>
              <p style="margin-top: 15px;">
                <a href="${process.env.BASE_URL}" style="color: #39FF14; text-decoration: none;">Visit ONBOARD3</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hey ${username},\n\nWelcome to ONBOARD3!\n\nPlease verify your email by clicking this link:\n${verificationLink}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, please ignore this email.`
    };

    const info = await transporter.sendMail(mailOptions);

    // Log preview URL for Ethereal
    if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_SERVICE) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: `"ONBOARD3" <${process.env.EMAIL_USER || 'noreply@onboard3.com'}>`,
      to: email,
      subject: '🎊 Email Verified - Welcome to ONBOARD3!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 2px solid #39FF14; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, rgba(57,255,20,0.2) 0%, rgba(57,255,20,0.05) 100%); padding: 40px 20px; text-align: center; }
            .logo { color: #39FF14; font-size: 32px; font-weight: 700; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .content p { line-height: 1.8; color: #ccc; font-size: 16px; margin: 15px 0; }
            .feature-box { background: rgba(57,255,20,0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(57,255,20,0.2); margin: 15px 0; }
            .feature-box h3 { color: #39FF14; margin-top: 0; }
            .button { display: inline-block; background: #39FF14; color: #0a0a0a; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 25px 0; font-size: 18px; }
            .footer { background: #0a0a0a; padding: 25px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #39FF14; }
            .highlight { color: #39FF14; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
              <h1>🎉 You're All Set!</h1>
            </div>
            <div class="content">
              <p>Congratulations <span class="highlight">${username}</span>!</p>
              <p>Your email has been verified successfully. You now have full access to all ONBOARD3 features!</p>
              
              <div class="feature-box">
                <h3>🏆 Complete Quests</h3>
                <p>Earn XP and climb the leaderboard by completing Web3 challenges.</p>
              </div>
              
              <div class="feature-box">
                <h3>🎓 Learn & Build</h3>
                <p>Access courses and workshops to level up your Web3 skills.</p>
              </div>
              
              <div class="feature-box">
                <h3>🎪 Attend Events</h3>
                <p>Join hackathons, meetups, and conferences in the Web3 space.</p>
              </div>
              
              <div class="feature-box">
                <h3>👥 Refer Friends</h3>
                <p>Share your referral link and earn rewards when friends join!</p>
              </div>

              <center>
                <a href="${process.env.BASE_URL}/dashboard" class="button">🚀 Go to Dashboard</a>
              </center>

              <p style="margin-top: 30px; color: #888;">
                Need help getting started? Check out our <a href="${process.env.BASE_URL}/about" style="color: #39FF14;">Getting Started Guide</a>.
              </p>
            </div>
            <div class="footer">
              <p>Happy building! 🛠️</p>
              <p>© ${new Date().getFullYear()} ONBOARD3. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Congratulations ${username}!\n\nYour email has been verified successfully!\n\nYou now have full access to:\n- Complete Quests\n- Learn & Build\n- Attend Events\n- Refer Friends\n\nVisit your dashboard: ${process.env.BASE_URL}/dashboard\n\nHappy building!`
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_SERVICE) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
};

// Send event registration email
exports.sendEventRegistrationEmail = async (email, username, event) => {
  try {
    const transporter = await getTransporter();
    const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: `"ONBOARD3 Events" <${process.env.EMAIL_USER || 'events@onboard3.com'}>`,
      to: email,
      subject: `✅ Registered: ${event.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 2px solid #39FF14; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, rgba(57,255,20,0.2) 0%, rgba(57,255,20,0.05) 100%); padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .event-details { background: rgba(57,255,20,0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(57,255,20,0.2); margin: 20px 0; }
            .event-details h3 { color: #39FF14; margin-top: 0; }
            .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid rgba(57,255,20,0.1); }
            .detail-label { color: #888; min-width: 100px; }
            .detail-value { color: #fff; font-weight: 600; }
            .button { display: inline-block; background: #39FF14; color: #0a0a0a; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 25px 0; font-size: 18px; }
            .footer { background: #0a0a0a; padding: 25px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #39FF14; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Registration Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hey <strong style="color: #39FF14;">${username}</strong>,</p>
              <p>You're successfully registered for:</p>
              
              <div class="event-details">
                <h3>${event.title}</h3>
                <div class="detail-row">
                  <div class="detail-label">📅 Date:</div>
                  <div class="detail-value">${eventDate}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">🕐 Time:</div>
                  <div class="detail-value">${event.startTime} - ${event.endTime} ${event.timezone}</div>
                </div>
                ${event.venue ? `
                <div class="detail-row">
                  <div class="detail-label">📍 Venue:</div>
                  <div class="detail-value">${event.venue}</div>
                </div>
                ` : ''}
                ${event.virtualLink ? `
                <div class="detail-row">
                  <div class="detail-label">🔗 Link:</div>
                  <div class="detail-value"><a href="${event.virtualLink}" style="color: #39FF14;">Join Virtual Event</a></div>
                </div>
                ` : ''}
              </div>

              <center>
                <a href="${process.env.BASE_URL}/dashboard/events/${event._id}" class="button">View Event Details</a>
              </center>

              <p style="margin-top: 30px; color: #888; font-size: 14px;">
                We'll send you a reminder before the event starts. See you there! 🎉
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ONBOARD3. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hey ${username},\n\nYou're registered for: ${event.title}\n\nDate: ${eventDate}\nTime: ${event.startTime} - ${event.endTime}\n\nSee you there!`
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
};