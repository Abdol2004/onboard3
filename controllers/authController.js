const User = require("../models/User");
const crypto = require("crypto");
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require("../utils/emailService");
const { validateEmailDomain } = require("../utils/emailValidator");

exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, referralCode, redirect } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ EMAIL DOMAIN VALIDATION
    const emailValidation = validateEmailDomain(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message,
        invalidDomain: true,
        domain: emailValidation.domain
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

    // ✅ IMPROVED IP DETECTION - Try multiple sources
    let ipAddress = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] ||
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    req.ip;
    
    // Clean IP (remove ::ffff: prefix for IPv4 and handle multiple IPs)
    if (ipAddress && ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    if (ipAddress && ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7);
    }
    
    console.log(`📍 Registration IP: ${ipAddress}`);

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

    // ✅ Check if email verification should be skipped (DB setting, fallback to env var)
    const SiteSettings = require('../models/SiteSettings');
    const siteSettings = await SiteSettings.getSettings();
    const skipEmailVerification = !siteSettings.emailVerificationRequired;

    // Generate verification token (even if skipping, keep for consistency)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    // Create new user
    const user = new User({
      username,
      email,
      password,
      verificationToken: skipEmailVerification ? undefined : verificationToken,
      verificationTokenExpires: skipEmailVerification ? undefined : verificationTokenExpires,
      isVerified: skipEmailVerification, // ✅ Auto-verify if SKIP_EMAIL_VERIFICATION=true
      referredBy: referralCode ? referralCode.toUpperCase() : null,
      referralRewardGiven: false,
      isAdmin: false,
      role: 'user',
      registrationIP: ipAddress, // ✅ Save IP for rate limiting
      lastLoginIP: ipAddress,
      lastLogin: new Date()
    });

    // Add initial welcome activity
    user.recentActivity = [
      {
        action: "Account created - Welcome to ONBOARD3! 🚀",
        timestamp: new Date(),
      },
    ];

    await user.save();
    console.log(`✅ User created: ${username} | IP: ${ipAddress} | Email: ${email} | Verified: ${skipEmailVerification}`);

    // ✅ SEND VERIFICATION EMAIL (only if not skipping)
    if (!skipEmailVerification) {
      try {
        console.log("📧 Sending verification email to:", email);
        const emailResult = await sendVerificationEmail(email, username, verificationToken);

        if (emailResult.success) {
          console.log("✅ Verification email sent successfully!");
        } else {
          console.error("❌ Failed to send verification email:", emailResult.error);
          // Still allow registration even if email fails
        }
      } catch (emailError) {
        console.error("❌ Error sending verification email:", emailError);
        // Still allow registration even if email fails
      }

      // Response - requires verification
      res.status(201).json({
        success: true,
        message: "Registration successful! Please check your email to verify your account.",
        requiresVerification: true,
      });
    } else {
      // ✅ SKIP EMAIL VERIFICATION - Process referral immediately
      if (user.referredBy && !user.referralRewardGiven) {
        try {
          const referrer = await User.findOne({ referralCode: user.referredBy });

          if (referrer) {
            if (!referrer.referralStats) {
              referrer.referralStats = {
                totalReferrals: 0,
                activeReferrals: 0,
                pendingReferrals: 0,
                totalEarned: 0
              };
            }

            referrer.referralStats.totalReferrals += 1;
            referrer.referralStats.activeReferrals += 1;

            const signupBonus = 50;
            referrer.xp += signupBonus;
            referrer.referralStats.totalEarned += signupBonus;

            referrer.recentActivity = referrer.recentActivity || [];
            referrer.recentActivity.unshift({
              action: `New referral: ${user.username} joined! Earned ${signupBonus} XP 🎉`,
              timestamp: new Date(),
            });

            if (referrer.recentActivity.length > 10) {
              referrer.recentActivity = referrer.recentActivity.slice(0, 10);
            }

            await referrer.save();
            user.referralRewardGiven = true;
            await user.save();

            console.log(`✅ Referral reward: ${referrer.username} earned ${signupBonus} XP from ${user.username}`);
          }
        } catch (referralError) {
          console.error("❌ Error processing referral:", referralError);
        }
      }

      // ✅ AUTO-LOGIN if redirect URL exists (for seamless event registration flow)
      if (redirect) {
        // Create session for auto-login
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.email = user.email;
        req.session.isAdmin = user.isAdmin || false;
        req.session.role = user.role || 'user';
        req.session.isVerified = user.isVerified;

        // Initialize badges for user (async, don't wait)
        const gamificationController = require('./gamificationController');
        gamificationController.initializeUserBadges(user._id).catch(err => {
          console.error('Error initializing badges:', err);
        });

        console.log(`✅ Auto-login after registration: ${user.username} → ${redirect}`);

        // Response - auto-logged in with redirect
        return res.status(201).json({
          success: true,
          message: "Registration successful! Redirecting...",
          requiresVerification: false,
          autoLogin: true,
          redirectUrl: redirect,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin || false,
            role: user.role || 'user',
            isVerified: user.isVerified
          }
        });
      }

      // Response - no verification needed, no redirect
      res.status(201).json({
        success: true,
        message: "Registration successful! You can now login.",
        requiresVerification: false,
      });
    }
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

    // ✅ Process referral reward AFTER verification
    if (user.referredBy && !user.referralRewardGiven) {
      try {
        const referrer = await User.findOne({ referralCode: user.referredBy });
        
        if (referrer) {
          // Initialize referralStats if not exists
          if (!referrer.referralStats) {
            referrer.referralStats = {
              totalReferrals: 0,
              activeReferrals: 0,
              pendingReferrals: 0,
              totalEarned: 0
            };
          }

          // Update stats
          referrer.referralStats.totalReferrals += 1;
          referrer.referralStats.activeReferrals += 1;
          
          const signupBonus = 50;
          referrer.xp += signupBonus;
          referrer.referralStats.totalEarned += signupBonus;

          // Add activity
          referrer.recentActivity = referrer.recentActivity || [];
          referrer.recentActivity.unshift({
            action: `New verified referral: ${user.username} joined! Earned ${signupBonus} XP 🎉`,
            timestamp: new Date(),
          });

          if (referrer.recentActivity.length > 10) {
            referrer.recentActivity = referrer.recentActivity.slice(0, 10);
          }

          await referrer.save();

          // Mark reward as given
          user.referralRewardGiven = true;
          await user.save();

          console.log(`✅ Referral reward: ${referrer.username} earned ${signupBonus} XP from ${user.username}`);
        }
      } catch (referralError) {
        console.error("❌ Error processing referral:", referralError);
      }
    }

    // Send welcome email
    try {
      console.log("📧 Sending welcome email to:", user.email);
      await sendWelcomeEmail(user.email, user.username);
      console.log("✅ Welcome email sent!");
    } catch (emailError) {
      console.error("❌ Error sending welcome email:", emailError);
    }

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

    // Send verification email
    try {
      console.log("📧 Resending verification email to:", email);
      const emailResult = await sendVerificationEmail(email, user.username, verificationToken);
      
      if (!emailResult.success) {
        console.error("❌ Failed to resend verification email:", emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email. Please try again.",
        });
      }
    } catch (emailError) {
      console.error("❌ Error resending verification email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Error sending email. Please try again.",
      });
    }

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

    // ✅ CHECK EMAIL VERIFICATION (controlled by SiteSettings in DB)
    const SiteSettings = require('../models/SiteSettings');
    const siteSettings = await SiteSettings.getSettings();
    const skipEmailVerification = !siteSettings.emailVerificationRequired;

    // Only block login if verification is required AND email service is actually configured
    // (no point blocking if users can't receive the verification email)
    const emailConfigured = (siteSettings.emailProvider === 'resend' && process.env.RESEND_API_KEY) ||
      (siteSettings.emailProvider === 'gmail' && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

    if (!user.isVerified && !skipEmailVerification && emailConfigured) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Auto-verify if verification is skipped or email service not configured
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
      console.log(`✅ Auto-verified user ${user.username} on login`);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ IMPROVED IP DETECTION
    let ipAddress = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] ||
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    req.ip;
    
    // Clean IP
    if (ipAddress && ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    if (ipAddress && ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7);
    }
    
    user.lastLoginIP = ipAddress;
    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.isAdmin = user.isAdmin || false;
    req.session.role = user.role || 'user';
    req.session.isVerified = user.isVerified;

    // Initialize badges for user (async, don't wait)
    const gamificationController = require('./gamificationController');
    gamificationController.initializeUserBadges(user._id).catch(err => {
      console.error('Error initializing badges:', err);
    });

    // Check if there's a redirect URL in the request body (for event registration redirects)
    const redirectUrl = req.body.redirect || null;

    res.status(200).json({
      success: true,
      message: "Login successful",
      redirectUrl: redirectUrl,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        role: user.role || 'user',
        isVerified: user.isVerified
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
      user: {
        ...user.toObject(),
        isAdmin: user.isAdmin || false,
        role: user.role || 'user'
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user data",
    });
  }
};

// Forgot Password Controller
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success message to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpires = resetTokenExpires;
    await user.save();

    // Send password reset email
    try {
      console.log("📧 Sending password reset email to:", email);
      const emailResult = await sendPasswordResetEmail(email, user.username, resetToken);

      if (!emailResult.success) {
        console.error("❌ Failed to send password reset email:", emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send reset email. Please try again.",
        });
      }

      console.log("✅ Password reset email sent successfully!");
    } catch (emailError) {
      console.error("❌ Error sending password reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Error sending reset email. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};

// Reset Password Page Controller
exports.resetPasswordPage = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.render("reset-password", {
        valid: false,
        message: "Reset token is missing",
        token: null,
      });
    }

    // Verify token is valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("reset-password", {
        valid: false,
        message: "Invalid or expired reset token",
        token: null,
      });
    }

    res.render("reset-password", {
      valid: true,
      message: null,
      token: token,
    });
  } catch (error) {
    console.error("Reset password page error:", error);
    res.render("reset-password", {
      valid: false,
      message: "Server error. Please try again.",
      token: null,
    });
  }
};

// Reset Password Controller
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
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

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};