require('dotenv').config();
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Email service type: 'gmail' or 'resend'
// Default from env; overridden at runtime by SiteSettings in DB
const emailServiceDefault = process.env.EMAIL_SERVICE || 'resend';

async function getActiveProvider() {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const settings = await SiteSettings.getSettings();
    return settings.emailProvider || emailServiceDefault;
  } catch {
    return emailServiceDefault;
  }
}

async function trackEmailSent(success, to, errorMsg) {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const settings = await SiteSettings.getSettings();
    if (!settings.emailStats) settings.emailStats = {};
    settings.emailStats.lastSentAt = new Date();
    settings.emailStats.lastSentTo = to;
    settings.emailStats.lastStatus = success ? 'success' : 'failed';
    if (!success && errorMsg) settings.emailStats.lastError = errorMsg;
    if (success) settings.emailStats.totalSent = (settings.emailStats.totalSent || 0) + 1;
    else settings.emailStats.totalFailed = (settings.emailStats.totalFailed || 0) + 1;
    await settings.save();
  } catch (e) {
    console.error('Failed to track email stats:', e.message);
  }
}

// Lazy initialization of Resend
let resend = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("❌ RESEND_API_KEY not found in environment variables!");
    }
    resend = new Resend(apiKey);
    console.log("✅ Resend initialized successfully");
  }
  return resend;
}

// Gmail SMTP transporter
let gmailTransporter = null;

function getGmailTransporter() {
  if (!gmailTransporter) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      throw new Error("❌ GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables!");
    }

    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    console.log("✅ Gmail SMTP initialized successfully");
  }
  return gmailTransporter;
}

const baseUrl = process.env.BASE_URL || "https://onboard3.app";
const fromEmail = process.env.FROM_EMAIL || "hello@onboard3.app";
const gmailFromEmail = process.env.GMAIL_USER || fromEmail;
const isDevelopment = process.env.NODE_ENV !== 'production';
const devEmail = "abdulfatahabdol2003@gmail.com";

// Test email connection
async function testEmailConnection() {
  try {
    const provider = await getActiveProvider();
    if (provider === 'gmail') {
      const transporter = getGmailTransporter();
      await transporter.verify();
      console.log("✅ Gmail SMTP email service is ready");
    } else {
      getResend();
      console.log("✅ Resend email service is ready");
      if (isDevelopment) {
        console.log("⚠️  DEVELOPMENT MODE: Emails will only be sent to", devEmail);
      }
    }
    return true;
  } catch (error) {
    console.error("❌ Email service verification failed:", error.message);
    return false;
  }
}

// Helper function to get recipient email
function getRecipientEmail(email, provider) {
  // For Gmail, send to actual recipient always
  if (provider === 'gmail') {
    return email;
  }
  // For Resend in dev mode, redirect to dev email
  if (isDevelopment && email !== devEmail) {
    console.log(`📧 DEV MODE: Redirecting email from ${email} to ${devEmail}`);
    return devEmail;
  }
  return email;
}

// Generic email sending function that supports both Gmail and Resend
// Retries up to 2 times on transient failures
async function sendEmail({ to, subject, html }) {
  const provider = await getActiveProvider();
  const recipientEmail = getRecipientEmail(to, provider);
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (provider === 'gmail') {
        const transporter = getGmailTransporter();
        const info = await transporter.sendMail({
          from: `ONBOARD3 <${gmailFromEmail}>`,
          to: recipientEmail,
          subject: subject,
          html: html
        });

        console.log("✅ Email sent via Gmail to:", recipientEmail, "MessageId:", info.messageId);
        trackEmailSent(true, to).catch(() => {});
        return { success: true, data: info };
      } else {
        const resendClient = getResend();
        const { data, error } = await resendClient.emails.send({
          from: `ONBOARD3 <${fromEmail}>`,
          to: recipientEmail,
          subject: subject,
          html: html
        });

        if (error) {
          if (attempt <= maxRetries) {
            console.warn(`⚠️ Resend error (attempt ${attempt}/${maxRetries + 1}), retrying:`, error.message || error);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          const errMsg = error.message || JSON.stringify(error);
          console.error("❌ Resend error (all retries failed):", error);
          trackEmailSent(false, to, errMsg).catch(() => {});
          return { success: false, error: errMsg };
        }

        console.log("✅ Email sent via Resend to:", recipientEmail);
        trackEmailSent(true, to).catch(() => {});
        return { success: true, data };
      }
    } catch (error) {
      if (attempt <= maxRetries) {
        console.warn(`⚠️ Email error (attempt ${attempt}/${maxRetries + 1}), retrying:`, error.message);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      console.error("❌ Email sending error (all retries failed):", error.message);
      trackEmailSent(false, to, error.message).catch(() => {});
      return { success: false, error: error.message };
    }
  }
}

// Send verification email
exports.sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    const html = `
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
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #39FF14;
              margin-bottom: 10px;
            }
            .content {
              background: rgba(20, 20, 20, 0.9);
              border: 1px solid rgba(57, 255, 20, 0.2);
              border-radius: 15px;
              padding: 30px;
            }
            h1 {
              color: #39FF14;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              line-height: 1.6;
              color: rgba(255, 255, 255, 0.9);
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: #39FF14;
              color: #0a0a0a;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: rgba(255, 255, 255, 0.6);
              font-size: 14px;
            }
            .token {
              background: rgba(57, 255, 20, 0.1);
              padding: 15px;
              border-radius: 8px;
              font-family: monospace;
              word-break: break-all;
              margin: 20px 0;
            }
            .dev-notice {
              background: rgba(255, 193, 7, 0.1);
              border: 1px solid rgba(255, 193, 7, 0.5);
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              color: #ffc107;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
            </div>
            <div class="content">
              ${isDevelopment && email !== devEmail ? `
                <div class="dev-notice">
                  <strong>⚠️ DEVELOPMENT MODE:</strong> This email was originally intended for ${email} but redirected to ${devEmail} for testing purposes.
                </div>
              ` : ''}
              <h1>Welcome ONBOARD, ${username}! 🚀</h1>
              <p>Thank you for joining the future of Web3 development. We're excited to have you onboard!</p>
              <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
              
              <center>
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </center>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="token">${verificationUrl}</div>
              
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              
              <p>If you didn't create an account with ONBOARD3, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Onboard. Educate. Build.</p>
              <p>Building the Future of Web3</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: "Verify Your Email - ONBOARD3",
      html: html
    });
  } catch (error) {
    console.error("❌ Error sending verification email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
exports.sendWelcomeEmail = async (email, username) => {
  try {
    const html = `
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
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #39FF14;
              margin-bottom: 10px;
            }
            .content {
              background: rgba(20, 20, 20, 0.9);
              border: 1px solid rgba(57, 255, 20, 0.2);
              border-radius: 15px;
              padding: 30px;
            }
            h1 {
              color: #39FF14;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              line-height: 1.6;
              color: rgba(255, 255, 255, 0.9);
              margin-bottom: 15px;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: #39FF14;
              color: #0a0a0a;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: rgba(255, 255, 255, 0.6);
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
            </div>
            <div class="content">
              <h1>🎉 Your Account is Verified!</h1>
              <p>Hi ${username},</p>
              <p>Congratulations! Your email has been successfully verified and your ONBOARD3 account is now active.</p>
              <p>You're now part of a community building the future of Web3. Here's what you can do next:</p>
              <ul style="color: rgba(255, 255, 255, 0.9); line-height: 1.8;">
                <li>Complete quests and earn rewards</li>
                <li>Join hackathons and build real projects</li>
                <li>Connect with other Web3 builders</li>
                <li>Access exclusive learning resources</li>
              </ul>
              
              <center>
                <a href="${baseUrl}" class="button">Start Building</a>
              </center>
              
              <p>Welcome onboard! </p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Onboard. Educate. Build.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: "Welcome ONBOARD! 🎉",
      html: html
    });
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, username, resetToken) => {
  try {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    const html = `
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
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #39FF14;
              margin-bottom: 10px;
            }
            .content {
              background: rgba(20, 20, 20, 0.9);
              border: 1px solid rgba(57, 255, 20, 0.2);
              border-radius: 15px;
              padding: 30px;
            }
            h1 {
              color: #39FF14;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              line-height: 1.6;
              color: rgba(255, 255, 255, 0.9);
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: #39FF14;
              color: #0a0a0a;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: rgba(255, 255, 255, 0.6);
              font-size: 14px;
            }
            .token {
              background: rgba(57, 255, 20, 0.1);
              padding: 15px;
              border-radius: 8px;
              font-family: monospace;
              word-break: break-all;
              margin: 20px 0;
            }
            .warning {
              background: rgba(255, 193, 7, 0.1);
              border: 1px solid rgba(255, 193, 7, 0.3);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              color: #ffc107;
              font-size: 14px;
            }
            .dev-notice {
              background: rgba(255, 193, 7, 0.1);
              border: 1px solid rgba(255, 193, 7, 0.5);
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              color: #ffc107;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
            </div>
            <div class="content">
              ${isDevelopment && email !== devEmail ? `
                <div class="dev-notice">
                  <strong>⚠️ DEVELOPMENT MODE:</strong> This email was originally intended for ${email} but redirected to ${devEmail} for testing purposes.
                </div>
              ` : ''}
              <h1>Reset Your Password</h1>
              <p>Hi ${username},</p>
              <p>We received a request to reset the password for your ONBOARD3 account. Click the button below to create a new password:</p>

              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>

              <p>Or copy and paste this link into your browser:</p>
              <div class="token">${resetUrl}</div>

              <div class="warning">
                <strong>⚠️ This link will expire in 1 hour.</strong><br>
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </div>

              <p>If you're having trouble, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Onboard. Educate. Build.</p>
              <p>Building the Future of Web3</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: "Reset Your Password - ONBOARD3",
      html: html
    });
  } catch (error) {
    console.error("❌ Error sending password reset email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send course application confirmation email
exports.sendCourseApplicationEmail = async (email, fullName, course) => {
  try {
    const html = `
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
              border: 1px solid #39FF14;
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #39FF14 0%, #2dd10d 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #0a0a0a;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .course-box {
              background: rgba(57, 255, 20, 0.1);
              border: 1px solid #39FF14;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              background: #0a0a0a;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 12px;
              border-top: 1px solid #39FF14;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 Application Received!</h1>
            </div>
            <div class="content">
              <h2 style="color: #39FF14;">Hey ${fullName}!</h2>
              <p>Thank you for applying to our <strong>${course}</strong> course!</p>
              
              <div class="course-box">
                <h3 style="color: #39FF14; margin-top: 0;">${course}</h3>
                <p style="color: #ccc;">Your application is being reviewed by our team</p>
              </div>

              <h3 style="color: #39FF14;">What's Next?</h3>
              <ul style="line-height: 1.8; color: #ccc;">
                <li>Our team will review your application within 3-5 business days</li>
                <li>You'll receive an email notification about your application status</li>
                <li>If approved, you'll get access to course materials and schedule</li>
                <li>Track your application status on your dashboard</li>
              </ul>

              <p style="color: #888; font-size: 14px; margin-top: 30px;">
                Questions? Feel free to reach out to us anytime!
              </p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Web3 Builder Hub</p>
              <p>Empowering the next generation of Web3 builders</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: `✅ Course Application Received - ${course}`,
      html: html
    });
  } catch (error) {
    console.error("❌ Error sending course application email:", error.message);
    return { success: false, error: error.message };
  }
};

// Export other email functions (approval, rejection, event emails) with the same pattern...
// I'll include the key ones below

exports.sendCourseApprovalEmail = async (email, fullName, course, courseDetails) => {
  try {
    const startDate = courseDetails.startDate
      ? new Date(courseDetails.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBA";

    const html = `
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
              border: 1px solid #39FF14;
              border-radius: 12px;
              overflow: hidden;
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
            .celebration {
              font-size: 60px;
              margin: 20px 0;
            }
            .content {
              padding: 40px 30px;
            }
            .course-details {
              background: rgba(57, 255, 20, 0.1);
              border: 1px solid #39FF14;
              border-radius: 8px;
              padding: 25px;
              margin: 25px 0;
            }
            .detail-item {
              margin: 15px 0;
              padding: 10px 0;
              border-bottom: 1px solid rgba(57, 255, 20, 0.2);
            }
            .button {
              display: inline-block;
              background: #39FF14;
              color: #0a0a0a;
              text-decoration: none;
              padding: 15px 35px;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              background: #0a0a0a;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 12px;
              border-top: 1px solid #39FF14;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="celebration">🎉</div>
              <h1>Congratulations!</h1>
            </div>
            <div class="content">
              <h2 style="color: #39FF14;">Welcome, ${fullName}!</h2>
              <p style="font-size: 18px;">We're thrilled to inform you that your application for <strong>${course}</strong> has been <span style="color: #39FF14;">APPROVED</span>!</p>
              
              <div class="course-details">
                <h3 style="color: #39FF14; margin-top: 0;">📚 Course Information</h3>

                <div class="detail-item"><strong style="color: #39FF14;">Course:</strong> ${course}</div>
                ${courseDetails.startDate ? `<div class="detail-item"><strong style="color: #39FF14;">Start Date:</strong> ${startDate}</div>` : ""}
                ${courseDetails.link ? `<div class="detail-item"><strong style="color: #39FF14;">Course Portal:</strong> <a href="${courseDetails.link}" style="color:#39FF14;">${courseDetails.link}</a></div>` : ""}
              </div>

              <h3 style="color: #39FF14;">🚀 Next Steps</h3>
              <ul style="line-height: 1.8; color: #ccc;">
                <li>Check your dashboard for course materials and schedule</li>
                <li>Join our course community (link in course portal)</li>
                <li>Prepare any required tools or wallets</li>
                <li>Mark your calendar for the start date</li>
              </ul>

              ${courseDetails.link ? `
              <div style="text-align:center;">
                <a href="${courseDetails.link}" class="button">Access Course Portal 🎓</a>
              </div>` : ""}

              <p style="color: #39FF14; text-align: center; margin-top: 30px; font-size: 18px;">
                Welcome to the ONBOARD3 family! 🌟
              </p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Web3 Builder Hub</p>
              <p>Building the future, one builder at a time 🚀</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: `🎉 Welcome to ${course} - Application Approved!`,
      html: html
    });
  } catch (error) {
    console.error("❌ Error sending course approval email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendCourseRejectionEmail = async (email, fullName, course, rejectionReason) => {
  try {
    const html = `
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
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              padding: 40px 30px;
              text-align: center;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .header h1 {
              margin: 0;
              color: #ffffff;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .reason-box {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .encouragement-box {
              background: rgba(57, 255, 20, 0.1);
              border: 1px solid #39FF14;
              border-radius: 8px;
              padding: 25px;
              margin: 25px 0;
            }
            .button {
              display: inline-block;
              background: #39FF14;
              color: #0a0a0a;
              text-decoration: none;
              padding: 15px 35px;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              background: #0a0a0a;
              padding: 20px;
              text-align: center;
              color: #888;
              font-size: 12px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Status Update</h1>
            </div>
            <div class="content">
              <h2 style="color: #ffffff;">Dear ${fullName},</h2>
              <p>Thank you for your interest in our <strong>${course}</strong> course and for taking the time to submit your application.</p>
              
              <p>After careful review, we regret to inform you that we are unable to accept your application at this time.</p>

              ${rejectionReason ? `
              <div class="reason-box">
                <h3 style="color: #ffffff; margin-top: 0;">Feedback</h3>
                <p style="color: #ccc;">${rejectionReason}</p>
              </div>
              ` : ''}

              <div class="encouragement-box">
                <h3 style="color: #39FF14; margin-top: 0;">🌟 Don't Give Up!</h3>
                <p style="color: #ccc;">This decision doesn't reflect your potential. We encourage you to:</p>
                <ul style="line-height: 1.8; color: #ccc;">
                  <li>Explore our other available courses and programs</li>
                  <li>Strengthen your skills through our free resources</li>
                  <li>Participate in community events and challenges</li>
                  <li>Reapply in the future when you feel ready</li>
                </ul>
              </div>

              <p>We appreciate your understanding and wish you the best in your Web3 journey.</p>

              <div style="text-align:center;">
                <a href="${baseUrl}/dashboard/courses" class="button">Explore Other Courses 🚀</a>
              </div>

              <p style="color: #888; font-size: 14px; margin-top: 30px;">
                If you have any questions, feel free to reach out to our team.
              </p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Web3 Builder Hub</p>
              <p>Keep Building 🚀</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: `Course Application Update - ${course}`,
      html: html
    });
  } catch (error) {
    console.error("❌ Error sending course rejection email:", error.message);
    return { success: false, error: error.message };
  }
};

// Export test function
exports.testEmailConnection = testEmailConnection;
exports.sendEmail = sendEmail;

// Initialize on module load
(async () => {
  try {
    await testEmailConnection();
  } catch (error) {
    console.error("❌ Failed to initialize email service:", error.message);
  }
})();

// Send Quest Reward Email
exports.sendQuestRewardEmail = async (email, username, amount, questTitle) => {
  try {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 2px solid #39FF14; border-radius: 12px; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #39FF14; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .amount { font-size: 48px; color: #39FF14; font-weight: bold; text-align: center; margin: 30px 0; }
            .quest-title { background: rgba(57, 255, 20, 0.1); border-left: 3px solid #39FF14; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .message { line-height: 1.6; color: #ccc; margin: 20px 0; }
            .button { display: inline-block; background: #39FF14; color: #0a0a0a; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
              <h2 style="color: #39FF14; margin: 0;">Quest Reward Received! 🎉</h2>
            </div>

            <p class="message">Hey <strong>${username}</strong>,</p>

            <p class="message">Congratulations! You've been awarded for your outstanding performance in a quest.</p>

            <div class="amount">$${amount} USDC</div>

            <div class="quest-title">
              <strong style="color: #39FF14;">Quest:</strong> ${questTitle}
            </div>

            <p class="message">
              The reward has been added to your dashboard balance. You can now:
            </p>

            <ul style="color: #ccc; line-height: 1.8;">
              <li>Use it to participate in more quests</li>
              <li>Withdraw it to your wallet</li>
              <li>Keep building and earning more!</li>
            </ul>

            <div style="text-align: center;">
              <a href="${baseUrl}/dashboard" class="button">
                View Dashboard
              </a>
            </div>

            <p class="message">
              Keep up the great work! 🚀
            </p>

            <div class="footer">
              <p>This is an automated message from ONBOARD3</p>
              <p>Questions? Contact us at support@onboard3.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

    return await sendEmail({
      to: email,
      subject: '🎉 You received a quest reward!',
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending quest reward email:', error);
    return { success: false, error: error.message };
  }
};

// Send Quest Winner Congratulations Email
exports.sendQuestWinnerEmail = async (email, username, amount, questTitle, position, stats) => {
  try {
    const positionMap = {
      1: { text: '1st', emoji: '🥇' },
      2: { text: '2nd', emoji: '🥈' },
      3: { text: '3rd', emoji: '🥉' },
      4: { text: '4th', emoji: '🏅' },
      5: { text: '5th', emoji: '🏅' },
      6: { text: '6th', emoji: '🏅' },
      7: { text: '7th', emoji: '🏅' },
      8: { text: '8th', emoji: '🏅' },
      9: { text: '9th', emoji: '🏅' },
      10: { text: '10th', emoji: '🏅' }
    };

    const posInfo = positionMap[position] || { text: `${position}th`, emoji: '🏅' };
    const { taskXp = 0, baseXp = 0, totalXp = 0, tasksCompleted = 0, totalTasks = 0 } = stats || {};

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 2px solid #39FF14; border-radius: 12px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #39FF14; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
    .trophy { font-size: 72px; margin: 20px 0; }
    .amount { font-size: 48px; color: #39FF14; font-weight: bold; text-align: center; margin: 30px 0; }
    .quest-title { background: rgba(57, 255, 20, 0.1); border-left: 3px solid #39FF14; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .message { line-height: 1.6; color: #ccc; margin: 20px 0; }
    .button { display: inline-block; background: #39FF14; color: #0a0a0a; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #888; font-size: 14px; }
    .info-box { background: rgba(57, 255, 20, 0.1); border-left: 3px solid #39FF14; padding: 15px; margin: 20px 0; border-radius: 4px; color: #ccc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ONBOARD3</div>
      <div class="trophy">${posInfo.emoji}</div>
      <h2 style="color: #39FF14; margin: 0;">Quest Winner - ${posInfo.text} Place! 🎉</h2>
    </div>

    <p class="message">Hey <strong>${username}</strong>,</p>

    <p class="message">Congratulations! You've secured <strong style="color: #39FF14;">${posInfo.text} place</strong> in ${questTitle}!</p>

    <div class="amount">$${amount} USDC</div>

    <div class="quest-title">
      <strong style="color: #39FF14;">Quest:</strong> ${questTitle}
    </div>

    <div class="info-box">
      <strong style="color: #39FF14;">💰 Payment Information</strong><br><br>
      Your <strong>$${amount} USDC</strong> prize has been added to your Onboard3 balance! You can now withdraw it to your wallet or use it for more quests.
    </div>

    <p class="message">
      <strong>Your Final Stats:</strong>
    </p>

    <ul style="color: #ccc; line-height: 1.8;">
      <li><strong style="color: #39FF14;">Total XP:</strong> ${totalXp} XP</li>
      <li><strong style="color: #39FF14;">Task XP:</strong> ${taskXp} XP</li>
      <li><strong style="color: #39FF14;">Base XP:</strong> ${baseXp} XP</li>
      <li><strong style="color: #39FF14;">Tasks Completed:</strong> ${tasksCompleted}/${totalTasks}</li>
    </ul>

    <p class="message">
      Thank you for participating and bringing your A-game! Keep an eye out for more exciting quests on Onboard3.
    </p>

    <div style="text-align: center;">
      <a href="${baseUrl}/dashboard" class="button">
        View Dashboard
      </a>
    </div>

    <p class="message">
      Keep up the great work! 🚀
    </p>

    <div class="footer">
      <p>This is an automated message from ONBOARD3</p>
      <p>Questions? Contact us at support@onboard3.com</p>
    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({
      to: email,
      subject: `${posInfo.emoji} Congratulations! You Won $${amount} in ${questTitle}!`,
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending quest winner email:', error);
    return { success: false, error: error.message };
  }
};

// ============= EVENT EMAIL TEMPLATES =============

// Send Event Confirmation Email (Auto-Approved)
// Helper: build a countdown string from now to event start
function buildCountdown(event) {
  try {
    const eventStart = new Date(event.startDate);
    if (event.startTime) {
      const [h, m] = event.startTime.split(':').map(Number);
      eventStart.setHours(h, m, 0, 0);
    }
    const now = new Date();
    const diffMs = eventStart - now;
    if (diffMs <= 0) return null; // event already started/past
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} away`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}, ${mins} minute${mins !== 1 ? 's' : ''} away`;
    return `${mins} minute${mins !== 1 ? 's' : ''} away`;
  } catch (e) {
    return null;
  }
}

// Helper: shared email CSS (light theme, works in all email clients)
function emailStyles() {
  return `
    body { margin: 0; padding: 0; background-color: #f0f0f0; font-family: Arial, Helvetica, sans-serif; }
    .wrapper { background-color: #f0f0f0; padding: 30px 15px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    .header { background-color: #0a0a0a; padding: 36px 30px; text-align: center; }
    .header h1 { margin: 10px 0 0 0; color: #39FF14; font-size: 28px; font-weight: bold; letter-spacing: 1px; }
    .header .icon { font-size: 52px; display: block; }
    .content { padding: 36px 30px; background-color: #ffffff; }
    .content h2 { color: #0a0a0a; font-size: 22px; margin-top: 0; }
    .content p { color: #333333; font-size: 16px; line-height: 1.7; }
    .event-box { background-color: #f8fff5; border-left: 4px solid #39FF14; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
    .event-box h3 { color: #0a0a0a; margin-top: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
    .detail-row { padding: 9px 0; border-bottom: 1px solid #e8e8e8; color: #333333; font-size: 15px; line-height: 1.5; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: bold; color: #0a0a0a; }
    .countdown-box { background-color: #0a0a0a; border-radius: 8px; padding: 16px 20px; margin: 20px 0; text-align: center; }
    .countdown-box p { margin: 0; color: #39FF14; font-size: 20px; font-weight: bold; letter-spacing: 1px; }
    .countdown-box span { color: #aaaaaa; font-size: 13px; display: block; margin-top: 4px; }
    .whatsapp-box { background-color: #f0fff4; border: 1px solid #25D366; border-radius: 8px; padding: 18px 20px; margin: 20px 0; text-align: center; }
    .whatsapp-box p { color: #1a1a1a; font-size: 15px; margin: 0 0 12px 0; font-weight: bold; }
    .whatsapp-btn { display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .checklist { padding-left: 20px; }
    .checklist li { color: #333333; font-size: 15px; line-height: 1.8; }
    .btn-wrap { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background-color: #39FF14; color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; }
    .footer { background-color: #0a0a0a; padding: 20px 30px; text-align: center; }
    .footer p { color: #888888; font-size: 12px; margin: 4px 0; }
    .footer .brand { color: #39FF14; font-weight: bold; font-size: 14px; }
  `;
}

exports.sendEventConfirmationEmail = async (email, username, event) => {
  try {
    const eventDate = new Date(event.startDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const eventEndDate = new Date(event.endDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const locationInfo = event.eventType === 'virtual'
      ? `<span class="detail-label">Virtual Link:</span> <a href="${event.virtualLink}" style="color:#39FF14;">${event.virtualLink}</a>`
      : event.eventType === 'physical'
      ? `<span class="detail-label">Venue:</span> ${event.venue}`
      : `<span class="detail-label">Venue:</span> ${event.venue}<br><span class="detail-label">Virtual Link:</span> <a href="${event.virtualLink}" style="color:#39FF14;">${event.virtualLink}</a>`;

    const countdown = buildCountdown(event);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="icon">✅</span>
        <h1>Registration Confirmed!</h1>
      </div>
      <div class="content">
        <h2>Hey ${username}!</h2>
        <p>You're all set! Your registration for <strong>${event.title}</strong> has been confirmed. We're excited to have you.</p>

        ${countdown ? `<div class="countdown-box"><p>⏳ ${countdown}</p><span>until the event starts</span></div>` : ''}

        <div class="event-box">
          <h3>Event Details</h3>
          <div class="detail-row"><span class="detail-label">Event:</span> ${event.title}</div>
          <div class="detail-row"><span class="detail-label">Type:</span> ${event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</div>
          <div class="detail-row"><span class="detail-label">Start:</span> ${eventDate} at ${event.startTime} WAT</div>
          <div class="detail-row"><span class="detail-label">End:</span> ${eventEndDate} at ${event.endTime} WAT</div>
          <div class="detail-row">${locationInfo}</div>
          ${event.city ? `<div class="detail-row"><span class="detail-label">Location:</span> ${event.city}, ${event.country}</div>` : ''}
        </div>

        ${event.whatsappGroup ? `
        <div class="whatsapp-box">
          <p>Join the event WhatsApp group to stay updated!</p>
          <a href="${event.whatsappGroup}" class="whatsapp-btn">💬 Join WhatsApp Group</a>
        </div>
        ` : ''}

        <p><strong>What's Next?</strong></p>
        <ul class="checklist">
          <li>Mark your calendar for ${eventDate}</li>
          <li>Prepare any required materials or tools</li>
          ${event.whatsappGroup ? '<li>Join the WhatsApp group above for updates and announcements</li>' : '<li>You\'ll receive a reminder closer to the event date</li>'}
          ${event.eventType !== 'physical' ? '<li>Virtual link will be active on event day</li>' : ''}
        </ul>

        <div class="btn-wrap">
          <a href="${baseUrl}/events/${event._id}" class="btn">View Event Details &raquo;</a>
        </div>

        <p style="text-align:center; color:#0a0a0a; font-weight:bold; margin-top:24px;">See you at the event!</p>
      </div>
      <div class="footer">
        <p class="brand">ONBOARD3</p>
        <p>Web3 Builder Hub &mdash; Building the future, one builder at a time</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({
      to: email,
      subject: `✅ Registration Confirmed - ${event.title}`,
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending event confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send Event Pending Email (Manual Approval)
exports.sendEventPendingEmail = async (email, username, event) => {
  try {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="icon">⏳</span>
        <h1>Registration Pending</h1>
      </div>
      <div class="content">
        <h2>Hey ${username}!</h2>
        <p>Thank you for registering for <strong>${event.title}</strong>! We've received your application.</p>

        <div class="event-box" style="border-left-color:#FFA500; background-color:#fffbf0;">
          <h3 style="color:#b36b00;">What Happens Next?</h3>
          <p style="color:#333333; margin:0;">Your registration is currently <strong style="color:#b36b00;">pending approval</strong>. Our team will review your application and notify you by email once a decision is made — usually within 24–48 hours.</p>
        </div>

        <p>You'll receive a confirmation email if approved, or a notification if there are any issues.</p>

        <p style="text-align:center; font-weight:bold; color:#0a0a0a; margin-top:24px;">We'll be in touch soon!</p>
      </div>
      <div class="footer">
        <p class="brand">ONBOARD3</p>
        <p>Web3 Builder Hub &mdash; Building the future, one builder at a time</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({
      to: email,
      subject: `⏳ Registration Pending - ${event.title}`,
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending event pending email:', error);
    return { success: false, error: error.message };
  }
};

// Send Event Approval Email
exports.sendEventApprovalEmail = async (email, username, event) => {
  try {
    const eventDate = new Date(event.startDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const eventEndDate = new Date(event.endDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const locationInfo = event.eventType === 'virtual'
      ? `<span class="detail-label">Virtual Link:</span> <a href="${event.virtualLink}" style="color:#39FF14;">${event.virtualLink}</a>`
      : event.eventType === 'physical'
      ? `<span class="detail-label">Venue:</span> ${event.venue}`
      : `<span class="detail-label">Venue:</span> ${event.venue}<br><span class="detail-label">Virtual Link:</span> <a href="${event.virtualLink}" style="color:#39FF14;">${event.virtualLink}</a>`;

    const countdown = buildCountdown(event);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="icon">🎉</span>
        <h1>Registration Approved!</h1>
      </div>
      <div class="content">
        <h2>Congratulations, ${username}!</h2>
        <p>Great news! Your registration for <strong>${event.title}</strong> has been <strong style="color:#1a8a00;">APPROVED</strong>. You're officially in!</p>

        ${countdown ? `<div class="countdown-box"><p>⏳ ${countdown}</p><span>until the event starts</span></div>` : ''}

        <div class="event-box">
          <h3>Event Details</h3>
          <div class="detail-row"><span class="detail-label">Event:</span> ${event.title}</div>
          <div class="detail-row"><span class="detail-label">Type:</span> ${event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</div>
          <div class="detail-row"><span class="detail-label">Start:</span> ${eventDate} at ${event.startTime} WAT</div>
          <div class="detail-row"><span class="detail-label">End:</span> ${eventEndDate} at ${event.endTime} WAT</div>
          <div class="detail-row">${locationInfo}</div>
          ${event.city ? `<div class="detail-row"><span class="detail-label">Location:</span> ${event.city}, ${event.country}</div>` : ''}
        </div>

        ${event.whatsappGroup ? `
        <div class="whatsapp-box">
          <p>Join the event WhatsApp group to stay updated!</p>
          <a href="${event.whatsappGroup}" class="whatsapp-btn">💬 Join WhatsApp Group</a>
        </div>
        ` : ''}

        <p><strong>What's Next?</strong></p>
        <ul class="checklist">
          <li>Mark your calendar for ${eventDate}</li>
          <li>Prepare any required materials or tools</li>
          ${event.whatsappGroup ? '<li>Join the WhatsApp group above for live updates and announcements</li>' : '<li>You\'ll receive a reminder closer to the event date</li>'}
          ${event.eventType !== 'physical' ? '<li>Virtual link will be active on event day</li>' : ''}
        </ul>

        <div class="btn-wrap">
          <a href="${baseUrl}/events/${event._id}" class="btn">View Event Details &raquo;</a>
        </div>

        <p style="text-align:center; font-weight:bold; color:#0a0a0a; margin-top:24px;">See you at the event!</p>
      </div>
      <div class="footer">
        <p class="brand">ONBOARD3</p>
        <p>Web3 Builder Hub &mdash; Building the future, one builder at a time</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({
      to: email,
      subject: `🎉 Registration Approved - ${event.title}`,
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending event approval email:', error);
    return { success: false, error: error.message };
  }
};

// Send Event Rejection Email
exports.sendEventRejectionEmail = async (email, username, event, reason) => {
  try {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="icon">📋</span>
        <h1>Registration Update</h1>
      </div>
      <div class="content">
        <h2>Hey ${username},</h2>
        <p>Thank you for your interest in <strong>${event.title}</strong>.</p>
        <p>Unfortunately, we're unable to approve your registration at this time.</p>

        <div class="event-box" style="border-left-color:#FF4444; background-color:#fff5f5;">
          <h3 style="color:#cc0000;">Reason</h3>
          <p style="color:#333333; margin:0; line-height:1.7;">${reason}</p>
        </div>

        <p>Don't worry — this doesn't affect your standing with ONBOARD3. We have many other exciting events and opportunities coming up that you can participate in.</p>

        <p style="text-align:center; font-weight:bold; color:#0a0a0a; margin-top:24px;">Keep building!</p>
      </div>
      <div class="footer">
        <p class="brand">ONBOARD3</p>
        <p>Web3 Builder Hub &mdash; Building the future, one builder at a time</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({
      to: email,
      subject: `Registration Update - ${event.title}`,
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending event rejection email:', error);
    return { success: false, error: error.message };
  }
};

// Send Event Reminder Email
exports.sendEventReminderEmail = async (email, username, event) => {
  try {
    const eventDate = new Date(event.startDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const locationInfo = event.eventType === 'virtual'
      ? `<span class="detail-label">Virtual Link:</span> <a href="${event.virtualLink}" style="color:#39FF14;">${event.virtualLink}</a>`
      : event.eventType === 'physical'
      ? `<span class="detail-label">Venue:</span> ${event.venue}`
      : `<span class="detail-label">Venue:</span> ${event.venue}<br><span class="detail-label">Virtual Link:</span> <a href="${event.virtualLink}" style="color:#39FF14;">${event.virtualLink}</a>`;

    const countdown = buildCountdown(event);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="icon">⏰</span>
        <h1>Event Reminder!</h1>
      </div>
      <div class="content">
        <h2>Hey ${username}!</h2>
        <p>This is a friendly reminder that <strong>${event.title}</strong> is coming up. Don't miss it!</p>

        ${countdown ? `<div class="countdown-box"><p>⏳ ${countdown}</p><span>until the event starts</span></div>` : ''}

        <div class="event-box">
          <h3>Event Details</h3>
          <div class="detail-row"><span class="detail-label">Event:</span> ${event.title}</div>
          <div class="detail-row"><span class="detail-label">Date:</span> ${eventDate}</div>
          <div class="detail-row"><span class="detail-label">Time:</span> ${event.startTime} &ndash; ${event.endTime} WAT</div>
          <div class="detail-row">${locationInfo}</div>
          ${event.city ? `<div class="detail-row"><span class="detail-label">Location:</span> ${event.city}, ${event.country}</div>` : ''}
        </div>

        ${event.whatsappGroup ? `
        <div class="whatsapp-box">
          <p>Haven't joined the event WhatsApp group yet? Join now for real-time updates and announcements!</p>
          <a href="${event.whatsappGroup}" class="whatsapp-btn">💬 Join WhatsApp Group</a>
        </div>
        ` : ''}

        <p><strong>Pre-Event Checklist</strong></p>
        <ul class="checklist">
          <li>${event.eventType !== 'physical' ? 'Have the virtual meeting link ready' : 'Save the venue address and plan your route'}</li>
          <li>Prepare any materials or questions you want to raise</li>
          <li>Set a personal reminder 15 minutes before the event</li>
          ${event.eventType !== 'physical' ? '<li>Test your audio and video setup beforehand</li>' : ''}
          ${event.whatsappGroup ? '<li>Check the WhatsApp group for any last-minute updates</li>' : ''}
        </ul>

        <div class="btn-wrap">
          <a href="${baseUrl}/events/${event._id}" class="btn">View Event Details &raquo;</a>
        </div>

        <p style="text-align:center; font-weight:bold; color:#0a0a0a; margin-top:24px;">See you there!</p>
      </div>
      <div class="footer">
        <p class="brand">ONBOARD3</p>
        <p>Web3 Builder Hub &mdash; Building the future, one builder at a time</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({
      to: email,
      subject: `⏰ Reminder: ${event.title} is coming up — ${eventDate}`,
      html: html
    });
  } catch (error) {
    console.error('❌ Error sending event reminder email:', error);
    return { success: false, error: error.message };
  }
};