// sendWelcomeEmails.js
require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('./models/User'); // Adjust path to your User model

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'onboardweb3ng@gmail.com', // Your Gmail address
    pass: 'sotf xvne tudu jsey' // Your Gmail App Password
  }
});

// Email template
const getEmailHTML = (username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome Onboard! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hi ${username}!</h2>
          <p>We're thrilled to have you join our community. Thank you for registering with us!</p>
          
          <p>Here's what you can do next:</p>
          <ul>
            <li>Complete your profile to get started</li>
            <li>Explore available quests</li>
            <li>Join our community on social media</li>
          </ul>
          
          <center>
            <a href="https://onboard3.app/auth" class="button">Get Started</a>
          </center>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p>Best regards,<br>The Team</p>
        </div>
        <div class="footer">
          <p>© 2025 Your Company. All rights reserved.</p>
          <p>If you didn't sign up for this account, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to send email with retry logic
async function sendEmail(user, retries = 3) {
  const mailOptions = {
    from: `"Your Platform" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to Our Platform! 🚀',
    html: getEmailHTML(user.username)
  };

  for (let i = 0; i < retries; i++) {
    try {
      await transporter.sendMail(mailOptions);
      return { success: true, email: user.email };
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
async function sendWelcomeEmails() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB ✓');

    // Get last 500 registered users
    console.log('\nFetching last 500 registered users...');
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .select('email username createdAt');

    console.log(`Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('No users found to send emails to.');
      process.exit(0);
    }

    // Send emails with rate limiting (to avoid Gmail limits)
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    console.log('Starting to send emails...\n');

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      console.log(`[${i + 1}/${users.length}] Sending to ${user.email}...`);
      
      const result = await sendEmail(user);
      
      if (result.success) {
        results.success++;
        console.log(`✓ Sent successfully`);
      } else {
        results.failed++;
        results.errors.push({ email: result.email, error: result.error });
        console.log(`✗ Failed: ${result.error}`);
      }

      // Rate limiting: Wait 1 second between emails to avoid Gmail limits
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('EMAIL SENDING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total users: ${users.length}`);
    console.log(`Successfully sent: ${results.success}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\nFailed emails:');
      results.errors.forEach(err => {
        console.log(`  - ${err.email}: ${err.error}`);
      });
    }

    console.log('\nDone! ✓');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
    process.exit(0);
  }
}

// Run the script
sendWelcomeEmails();