const nodemailer = require("nodemailer");
const adminEmail="abdulfatahabdol2004@gmail.com"
const emailPassword="sbss rmqr kiub lmjz"
// Send verification email
exports.sendVerificationEmail = async (email, username, verificationToken) => {
  // Check if email credentials are configured
  if (!adminEmail || !emailPassword) {
    console.error("❌ Email credentials not found in .env file!");
    console.log("Please add EMAIL_USER and EMAIL_PASSWORD to your .env file");
    return { success: false, error: "Email service not configured" };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: adminEmail,
      pass: emailPassword
    }
  });

  const verificationUrl = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"ONBOARD3" <${process.env.EMAIL_USER}>`,
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

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
exports.sendWelcomeEmail = async (email, username) => {
  // Check if email credentials are configured
  if (!adminEmail || !emailPassword) {
    console.error("❌ Email credentials not found in .env file!");
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: adminEmail,
      pass: emailPassword
    }
  });

  const mailOptions = {
    from: `"ONBOARD3" <${process.env.EMAIL_USER}>`,
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
              <a href="${process.env.BASE_URL}" class="button">Start Building</a>
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

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent to:", email);
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
  }
};
exports.sendCourseApplicationEmail = async (email, fullName, course) => {
  try {
    const mailOptions = {
      from: `ONBOARD3 <${process.env.EMAIL_USER}>`,
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
    return { success: true };
  } catch (error) {
    console.error("Course application email error:", error);
    return { success: false, error: error.message };
  }
};

// ------------------------------------------------------------
// 🎉 2. Course Approval Email
// ------------------------------------------------------------
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

    const mailOptions = {
      from: `ONBOARD3 <${process.env.EMAIL_USER}>`,
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
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Course approval email error:", error);
    return { success: false, error: error.message };
  }
};

// ------------------------------------------------------------
// ❌ 3. Course Rejection Email
// ------------------------------------------------------------
exports.sendCourseRejectionEmail = async (email, fullName, course, notes) => {
  try {
    const mailOptions = {
      from: `ONBOARD3 <${process.env.EMAIL_USER}>`,
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
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Course rejection email error:", error);
    return { success: false, error: error.message };
  }
};