require('dotenv').config();
const { Resend } = require('resend');


// Lazy initialization of Resend
let resend = null;

function getResend() {
     if (!resend) {
       const apiKey = process.env.RESEND_API_KEY; // Use env variable
       if (!apiKey) {
         throw new Error("❌ RESEND_API_KEY not found in environment variables!");
       }
       resend = new Resend(apiKey);
       console.log("✅ Resend initialized successfully");
     }
     return resend;
   }

const baseUrl = process.env.BASE_URL || "https://onboard3.app";
const fromEmail = process.env.FROM_EMAIL || "hello@onboard3.app";
const isDevelopment = process.env.NODE_ENV !== 'production';
const devEmail = "abdulfatahabdol2003@gmail.com"; // Your verified email for testing

// Test email connection
async function testEmailConnection() {
  try {
    getResend();
    console.log("✅ Resend email service is ready");
    if (isDevelopment) {
      console.log("⚠️  DEVELOPMENT MODE: Emails will only be sent to", devEmail);
      console.log("⚠️  To send to other emails, verify a domain at https://resend.com/domains");
    }
    return true;
  } catch (error) {
    console.error("❌ Email service verification failed:", error.message);
    return false;
  }
}

// Helper function to get recipient email (use dev email in development)
function getRecipientEmail(email) {
  if (isDevelopment && email !== devEmail) {
    console.log(`📧 DEV MODE: Redirecting email from ${email} to ${devEmail}`);
    return devEmail;
  }
  return email;
}

// Send verification email
exports.sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const resendClient = getResend();
    const recipientEmail = getRecipientEmail(email);
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    const { data, error } = await resendClient.emails.send({
      from: `ONBOARD3 <${fromEmail}>`,
      to: recipientEmail,
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
      `
    });

    if (error) {
      console.error("❌ Error sending verification email:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("✅ Verification email sent to:", recipientEmail);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending verification email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
exports.sendWelcomeEmail = async (email, username) => {
  try {
    const resendClient = getResend();
    const recipientEmail = getRecipientEmail(email);
    
    const { data, error } = await resendClient.emails.send({
      from: `ONBOARD3 <${fromEmail}>`,
      to: recipientEmail,
      subject: "Welcome ONBOARD! 🎉",
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
              
              <p>Welcome onboard! </p>
            </div>
            <div class="footer">
              <p>ONBOARD3 - Onboard. Educate. Build.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error("❌ Error sending welcome email:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("✅ Welcome email sent to:", recipientEmail);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send course application confirmation email
exports.sendCourseApplicationEmail = async (email, fullName, course) => {
  try {
    const resendClient = getResend();
    const recipientEmail = getRecipientEmail(email);
    
    const { data, error } = await resendClient.emails.send({
      from: `ONBOARD3 <${fromEmail}>`,
      to: recipientEmail,
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
              <p>Empowering the next generation of Web3 builders</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error("❌ Error sending course application email:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("✅ Course application email sent to:", recipientEmail);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending course application email:", error.message);
    return { success: false, error: error.message };
  }
};

// Export other email functions (approval, rejection, event emails) with the same pattern...
// I'll include the key ones below

exports.sendCourseApprovalEmail = async (email, fullName, course, courseDetails) => {
  try {
    const resendClient = getResend();
    const recipientEmail = getRecipientEmail(email);
    
    const startDate = courseDetails.startDate
      ? new Date(courseDetails.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBA";

    const { data, error } = await resendClient.emails.send({
      from: `ONBOARD3 <${fromEmail}>`,
      to: recipientEmail,
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
    });

    if (error) {
      console.error("❌ Error sending course approval email:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("✅ Course approval email sent to:", recipientEmail);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending course approval email:", error.message);
    return { success: false, error: error.message };
  }
};
exports.sendCourseRejectionEmail = async (email, fullName, course, rejectionReason) => {
  try {
    const resendClient = getResend();
    const recipientEmail = getRecipientEmail(email);
    
    const { data, error } = await resendClient.emails.send({
      from: `ONBOARD3 <${fromEmail}>`,
      to: recipientEmail,
      subject: `Course Application Update - ${course}`,
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
      `
    });

    if (error) {
      console.error("❌ Error sending course rejection email:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("✅ Course rejection email sent to:", recipientEmail);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error sending course rejection email:", error.message);
    return { success: false, error: error.message };
  }
};

// Export test function
exports.testEmailConnection = testEmailConnection;

// Initialize on module load
(async () => {
  try {
    await testEmailConnection();
  } catch (error) {
    console.error("❌ Failed to initialize email service:", error.message);
  }
})();