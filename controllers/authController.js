// controllers/authController.js - WITH EMAIL VERIFICATION

const User = require("../models/User");
const crypto = require("crypto");
const { sendVerificationEmail, sendWelcomeEmail } = require("../utils/emailService");

// Register
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, referralCode } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Validate referral code if provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create new user
    const user = new User({
      username,
      email,
      password,
      verificationToken,
      verificationTokenExpires,
      isVerified: false, // User must verify email
      referredBy: referralCode ? referralCode.toUpperCase() : null,
    });

    // Add initial welcome activity
    user.recentActivity = [
      {
        action: "Account created - Welcome to ONBOARD3! 🚀",
        timestamp: new Date(),
      },
    ];

    await user.save();

    // Process referral reward if user was referred
    if (referrer) {
      try {
        referrer.referralStats.totalReferrals += 1;
        referrer.referralStats.activeReferrals += 1;
        
        const signupBonus = 50;
        referrer.xp += signupBonus;
        referrer.referralStats.totalEarned += signupBonus;

        referrer.recentActivity.unshift({
          action: `New referral: ${username} signed up! Earned ${signupBonus} XP 🎉`,
          timestamp: new Date(),
        });

        if (referrer.recentActivity.length > 10) {
          referrer.recentActivity = referrer.recentActivity.slice(0, 10);
        }

        await referrer.save();
        console.log(`✅ Referral: ${referrer.username} earned ${signupBonus} XP from ${username}`);
      } catch (referralError) {
        console.error("❌ Referral error:", referralError);
      }
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(email, username, verificationToken);
    
    if (!emailResult.success) {
      console.error("❌ Failed to send verification email:", emailResult.error);
    } else {
      console.log(`📧 Verification email sent to ${email}`);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      requiresVerification: true,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.render("verify-result", {
        success: false,
        message: "Verification token is missing",
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("verify-result", {
        success: false,
        message: "Invalid or expired verification token. Please request a new one.",
      });
    }

    // Verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    
    // Add activity
    user.recentActivity.unshift({
      action: "Email verified successfully! 🎉",
      timestamp: new Date(),
    });

    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.username);

    console.log(`✅ Email verified: ${user.email}`);

    res.render("verify-result", {
      success: true,
      message: "Email verified successfully! You can now login.",
      username: user.username,
    });
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.render("verify-result", {
      success: false,
      message: "Server error during verification",
    });
  }
};

// Resend Verification Email
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send new verification email
    const emailResult = await sendVerificationEmail(user.email, user.username, verificationToken);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    console.log(`📧 Verification email resent to ${email}`);

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create session
    req.session.userId = user._id;
    req.session.username = user.username;

    console.log(`✅ Login: ${user.username}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Logout
exports.logout = (req, res) => {
  const username = req.session.username;
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Error logging out",
      });
    }
    console.log(`✅ Logout: ${username}`);
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  });
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await User.findById(req.session.userId).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user data",
    });
  }
};