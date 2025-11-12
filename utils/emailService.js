const nodemailer = require("nodemailer");

// ✅ FIXED: Get credentials from environment variables
const adminEmail = process.env.EMAIL_USER || "abdulfatahabdol2004@gmail.com";
const emailPassword = process.env.EMAIL_PASSWORD || "sbss rmqr kiub lmjz";
const baseUrl = process.env.BASE_URL || "http://localhost:3000";

// ✅ ADDED: Create transporter once and reuse
let transporter = null;

function getTransporter() {
  if (!transporter) {
    // Check if email credentials are configured
    if (!adminEmail || !emailPassword) {
      console.error("❌ Email credentials not found!");
      console.log("Please set EMAIL_USER and EMAIL_PASSWORD environment variables");
      throw new Error("Email service not configured");
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: adminEmail,
        pass: emailPassword
      },
      // ✅ ADDED: Better configuration for production
      secure: true,
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    console.log("✅ Email transporter created with user:", adminEmail);
  }
  return transporter;
}

// ✅ ADDED: Test email connection
async function testEmailConnection() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log("✅ Email service is ready to send emails");
    return true;
  } catch (error) {
    console.error("❌ Email service verification failed:", error.message);
    return false;
  }
}

// Send verification email
exports.sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const transporter = getTransporter();
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: "Verify Your Email - ONBOARD3",
      html: `
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ONBOARD3</div>
            </div>
            <div class="content">
              <h1>Welcome to ONBOARD3, ${username}! 🚀</h1>
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
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending verification email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
exports.sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: "Welcome to ONBOARD3! 🎉",
      html: `
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
              
              <p>Welcome aboard! 🚀</p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Onboard. Educate. Build.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send course application confirmation email
exports.sendCourseApplicationEmail = async (email, fullName, course) => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: `✅ Course Application Received - ${course}`,
      html: `
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
              <p>Empowering the next generation of Web3 builders 🚀</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Course application email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending course application email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send course approval email
exports.sendCourseApprovalEmail = async (email, fullName, course, courseDetails) => {
  try {
    const transporter = getTransporter();
    
    const startDate = courseDetails.startDate
      ? new Date(courseDetails.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBA";

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: `🎉 Welcome to ${course} - Application Approved!`,
      html: `
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
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Course approval email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending course approval email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send course rejection email
exports.sendCourseRejectionEmail = async (email, fullName, course, notes) => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: `Update on Your ${course} Application`,
      html: `
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
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              padding: 30px;
              text-align: center;
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
            .info-box {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 20px;
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
              <h1>📬 Application Update</h1>
            </div>
            <div class="content">
              <h2 style="color: #39FF14;">Hi ${fullName},</h2>
              <p>Thank you for your interest in our <strong>${course}</strong> course.</p>
              <p>After careful review, we regret to inform you that we're unable to accept your application at this time.</p>
              ${
                notes
                  ? `<div class="info-box">
                      <strong style="color: #39FF14;">Feedback:</strong>
                      <p style="color: #ccc; margin-top: 10px;">${notes}</p>
                    </div>`
                  : ""
              }
              <p style="color: #ccc;">We encourage you to reapply in the next cohort or explore other programs that match your interests.</p>
              <p style="color: #39FF14; margin-top: 20px;">Keep building, your journey is just beginning 💪</p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Web3 Builder Hub</p>
              <p>See you in the next cohort 🚀</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Course rejection email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending course rejection email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send event registration email
exports.sendEventRegistrationEmail = async (email, username, event) => {
  try {
    const transporter = getTransporter();
    
    const eventDate = new Date(event.startDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: `🎉 You're Registered for ${event.title}!`,
      html: `
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
            .event-details {
              background: rgba(57, 255, 20, 0.1);
              border: 1px solid #39FF14;
              border-radius: 8px;
              padding: 25px;
              margin: 25px 0;
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
              <h1>🎉 Registration Confirmed!</h1>
            </div>
            <div class="content">
              <h2 style="color: #39FF14;">Hey ${username}!</h2>
              <p>You're all set for <strong>${event.title}</strong>!</p>
              
              <div class="event-details">
                <h3 style="color: #39FF14; margin-top: 0;">📅 Event Details</h3>
                <p><strong style="color: #39FF14;">Date:</strong> ${eventDate}</p>
                <p><strong style="color: #39FF14;">Location:</strong> ${event.location}</p>
                ${event.meetingLink ? `<p><strong style="color: #39FF14;">Meeting Link:</strong> <a href="${event.meetingLink}" style="color:#39FF14;">${event.meetingLink}</a></p>` : ""}
              </div>

              <p>We'll send you a reminder before the event. See you there! 🚀</p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Web3 Builder Hub</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Event registration email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending event registration email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send event reminder email
exports.sendEventReminderEmail = async (email, username, event) => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"ONBOARD3" <${adminEmail}>`,
      to: email,
      subject: `⏰ Reminder: ${event.title} starts soon!`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #39FF14; border-radius: 12px; padding: 30px;">
            <h1 style="color: #39FF14;">⏰ Event Reminder</h1>
            <p>Hi ${username},</p>
            <p>This is a reminder that <strong>${event.title}</strong> is starting soon!</p>
            <p><strong>Location:</strong> ${event.location}</p>
            ${event.meetingLink ? `<p><strong>Join here:</strong> <a href="${event.meetingLink}" style="color:#39FF14;">${event.meetingLink}</a></p>` : ""}
            <p>See you there! 🚀</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Event reminder email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending event reminder email:", error.message);
    return { success: false, error: error.message };
  }
};

// ✅ ADDED: Export test function
exports.testEmailConnection = testEmailConnection;

// ✅ ADDED: Initialize on module load
(async () => {
  try {
    await testEmailConnection();
  } catch (error) {
    console.error("❌ Failed to initialize email service:", error.message);
  }
})();