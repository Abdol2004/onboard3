// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// models/User.js - Add these fields to your existing schema

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verificationTokenExpires: {
    type: Date
  },
  
  // ✅ ADD THESE NEW FIELDS FOR IP TRACKING
  registrationIP: {
    type: String,
    default: null
  },
  lastLoginIP: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  
  // ... rest of your existing fields ...
  profession: {
    type: String,
    default: null
  },
  walletAddress: {
    type: String,
    default: null
  },
  usdcBalance: {
    type: Number,
    default: 0
  },
  xp: {
    type: Number,
    default: 0
  },
  questRank: {
    type: Number,
    default: null
  },
  bountyRank: {
    type: Number,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  twitter: {
    type: String,
    default: ''
  },
  github: {
    type: String,
    default: ''
  },
  telegram: {
    type: String,
    default: ''
  },
  notifications: {
    newQuests: {
      type: Boolean,
      default: true
    },
    newBounties: {
      type: Boolean,
      default: true
    },
    eventReminders: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: false
    },
    submissionUpdates: {
      type: Boolean,
      default: true
    }
  },
  privacy: {
    showOnLeaderboard: {
      type: Boolean,
      default: true
    },
    publicProfile: {
      type: Boolean,
      default: true
    }
  },
  activeQuests: {
    type: Array,
    default: []
  },
  activeBounties: {
    type: Array,
    default: []
  },
  courseApplications: {
    type: Array,
    default: []
  },
  recentActivity: {
    type: Array,
    default: []
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: String,
    default: null
  },
  referralRewardGiven: {
    type: Boolean,
    default: false
  },
  referralStats: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    activeReferrals: {
      type: Number,
      default: 0
    },
    pendingReferrals: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);