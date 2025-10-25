// authController.js - FIXED REGISTER FUNCTION

const User = require("../models/User");
const crypto = require("crypto");

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
      isVerified: true, // Set to false if you want email verification
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
        // Update referrer's stats
        referrer.referralStats.totalReferrals += 1;
        referrer.referralStats.activeReferrals += 1;
        
        // Add signup bonus XP
        const signupBonus = 50;
        referrer.xp += signupBonus;
        referrer.referralStats.totalEarned += signupBonus;

        // Add activity to referrer
        referrer.recentActivity.unshift({
          action: `New referral: ${username} signed up! Earned ${signupBonus} XP 🎉`,
          timestamp: new Date(),
        });

        // Keep only last 10 activities
        if (referrer.recentActivity.length > 10) {
          referrer.recentActivity = referrer.recentActivity.slice(0, 10);
        }

        await referrer.save();

        console.log(`Referral processed: ${referrer.username} earned ${signupBonus} XP from ${username}`);
      } catch (referralError) {
        console.error("Error processing referral:", referralError);
        // Don't fail registration if referral processing fails
      }
    }

    // Response
    res.status(201).json({
      success: true,
      message: "Registration successful! Please login to your account.",
      requiresVerification: false, // Set to true if using email verification
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Email Verification Controller
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).render("verify-result", {
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
      return res.status(400).render("verify-result", {
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.render("verify-result", {
      success: true,
      message: "Email verified successfully! You can now login.",
      username: user.username,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).render("verify-result", {
      success: false,
      message: "Server error during verification",
    });
  }
};

// Resend Verification Email Controller
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

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};

// Login Controller
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

    // Session
    req.session.userId = user._id;
    req.session.username = user.username;

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
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Logout Controller
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Error logging out",
      });
    }
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
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user data",
    });
  }
};