const User = require("../models/User");
const crypto = require("crypto");
const { sendVerificationEmail, sendWelcomeEmail } = require("../utils/emailService");
const { validateEmailDomain } = require("../utils/emailValidator");

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
    
    // ✅ IP-BASED RATE LIMITING
    const recentAccountsFromIP = await User.countDocuments({
      registrationIP: ipAddress,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    console.log(`📊 Accounts from IP ${ipAddress} in last 24h: ${recentAccountsFromIP}`);

    // Limit: Max 1 accounts per IP per 24 hours
    if (recentAccountsFromIP >= 1) {
      console.log(`🚫 RATE LIMIT BLOCKED: IP ${ipAddress} tried to create account #${recentAccountsFromIP + 1}`);
      return res.status(429).json({
        success: false,
        message: "Maximum accounts reached from your network. Please contact support if you need assistance.",
        rateLimited: true
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

    // ✅ CHECK IF EMAIL VERIFICATION IS SKIPPED
    const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    
    let verificationToken = null;
    let verificationTokenExpires = null;
    let isVerified = false;

    if (!skipVerification) {
      // Normal flow: Generate verification token
      verificationToken = crypto.randomBytes(32).toString("hex");
      verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
      isVerified = false;
    } else {
      // ⚠️ TEMPORARY: Auto-verify new users
      isVerified = true;
      console.log(`⚠️  SKIP_EMAIL_VERIFICATION enabled - auto-verifying ${email}`);
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      verificationToken,
      verificationTokenExpires,
      isVerified,
      referredBy: referralCode ? referralCode.toUpperCase() : null,
      referralRewardGiven: false,
      isAdmin: false,
      role: 'user',
      registrationIP: ipAddress, // ✅ Save IP
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
    console.log(`✅ User created: ${username} | IP: ${ipAddress}`);

    // ✅ If auto-verified, process referral reward immediately
    if (skipVerification && referralCode && referrer) {
      try {
        // Initialize referralStats if not exists
        if (!referrer.referralStats) {
          referrer.referralStats = {
            totalReferrals: 0,
            activeReferrals: 0,
            pendingReferrals: 0,
            totalEarned: 0
          };
        }

        const signupBonus = 50;
        referrer.referralStats.totalReferrals += 1;
        referrer.referralStats.activeReferrals += 1;
        referrer.xp += signupBonus;
        referrer.referralStats.totalEarned += signupBonus;

        // Add activity
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

        console.log(`💰 Instant referral reward: ${referrer.username} +${signupBonus} XP from ${user.username}`);
      } catch (refError) {
        console.error("❌ Referral processing error:", refError);
      }
    }

    // Send verification email only if NOT skipping
    if (!skipVerification) {
      try {
        console.log("📧 Attempting to send verification email to:", email);
        const emailResult = await sendVerificationEmail(email, username, verificationToken);
        
        if (emailResult.success) {
          console.log("✅ Verification email sent successfully!");
        } else {
          console.error("❌ Failed to send verification email:", emailResult.error);
        }
      } catch (emailError) {
        console.error("❌ Error sending verification email:", emailError);
      }
    } else {
      console.log("⚠️  Verification email skipped (auto-verified mode active)");
    }

    // Response
    res.status(201).json({
      success: true,
      message: skipVerification 
        ? "Registration successful! You can now login immediately." 
        : "Registration successful! Please check your email to verify your account.",
      requiresVerification: !skipVerification,
      autoVerified: skipVerification,
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

    // ✅ Process referral reward
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

    // ✅ Allow login even if not verified (when skip mode is on)
    const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    
    if (!user.isVerified && !skipVerification) {
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

    res.status(200).json({
      success: true,
      message: "Login successful",
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