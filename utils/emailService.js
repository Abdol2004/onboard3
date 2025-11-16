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

exports.sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    const resendClient = getResend();
    const recipientEmail = getRecipientEmail(email);
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    const { data, error } = await resendClient.emails.send({
      from: `Onboard3 <${fromEmail}>`,
      to: recipientEmail,
      
      // ✅ CRITICAL: Gmail-friendly subject (no special chars, short, clear)
      subject: "Verify your Onboard3 account",
      
      // ✅ CRITICAL: Gmail requires plain text version
      text: `
Hi ${username},

Thank you for signing up for Onboard3.

Please verify your email address by clicking this link:
${verificationUrl}

This verification link will expire in 24 hours.

If you did not sign up for Onboard3, you can safely ignore this email.

Best regards,
Onboard3 Team

${baseUrl}
      `.trim(),
      
      // ✅ CRITICAL: Simplified HTML (Gmail hates complex CSS)
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; background-color: #39FF14; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #000000;">Onboard3</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #333333;">Hi ${username},</h2>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #555555;">
                Thank you for signing up for Onboard3. To complete your registration, please verify your email address.
              </p>
              
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 20px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 30px; background-color: #39FF14; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.5; color: #777777;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 10px 0 0 0; padding: 12px; background-color: #f8f8f8; border-radius: 4px; word-break: break-all; font-size: 13px; color: #555555;">
                ${verificationUrl}
              </p>
              
              <p style="margin: 30px 0 0 0; font-size: 13px; color: #999999;">
                This link will expire in 24 hours. If you did not create an account, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #888888;">Onboard3 - Web3 Builder Platform</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #aaaaaa;">
                <a href="${baseUrl}" style="color: #39FF14; text-decoration: none;">${baseUrl}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
      
      // ✅ CRITICAL: Add email headers for better deliverability
      headers: {
        'X-Entity-Ref-ID': `${Date.now()}-${verificationToken.substring(0, 8)}`,
      }
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log(`✅ Email sent to: ${recipientEmail} | ID: ${data?.id}`);
    return { success: true, data };
    
  } catch (error) {
    console.error("❌ Email exception:", error);
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