const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  taskType: {
    type: String,
    enum: ['social', 'submission', 'verification', 'quiz', 'external', 'daily'],
    default: 'submission'
  },
  // NEW: XP reward per task
  xpReward: {
    type: Number,
    default: 0
  },
  // NEW: Is this a daily task?
  isDaily: {
    type: Boolean,
    default: false
  },
  buttonText: {
    type: String,
    default: null
  },
  buttonLink: {
    type: String,
    default: null
  },
  inputLabel: {
    type: String,
    default: null
  },
  inputName: {
    type: String,
    default: null
  },
  requirements: {
    url: String,
    platform: String,
    action: String
  },
  validationUrl: {
    type: String
  }
});

const questSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['development', 'social', 'learning', 'community', 'special'],
    default: 'learning'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  
  // ==================== NEW QUEST TYPES ====================
 questType: {
  type: String,
  enum: ['standard', 'referral_boost', 'fcfs', 'competition', 'permanent', 'daily', 'weekly', 'monthly', 'special'],
  default: 'standard'
    // standard = old permanent quests
    // referral_boost = earn bonus XP for referrals who join
    // fcfs = first come first serve, no referral bonus
    // competition = leaderboard-based with rankings
  },
  
  // ==================== QUEST DATES ====================
  startDate: {
    type: Date,
    default: null // null = starts immediately
  },
  endDate: {
    type: Date,
    default: null // null = no end date
  },
  
  // ==================== REFERRAL SYSTEM ====================
  referralConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    // XP bonus per referral who JOINS the quest
    xpPerReferralJoin: {
      type: Number,
      default: 0
    },
    // XP bonus per referral who COMPLETES the quest
    xpPerReferralComplete: {
      type: Number,
      default: 0
    }
  },
  
  // ==================== COMPETITION SETTINGS ====================
  competitionConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    // Number of winners (top 10, top 20, etc.)
    topWinnersCount: {
      type: Number,
      default: 10
    },
    // Bonus XP for winners
    winnerBonusXP: {
      type: Number,
      default: 0
    }
  },
  
  // ==================== REWARDS ====================
  // Base XP (given when quest is completed)
  baseXpReward: {
    type: Number,
    default: 0
  },
  usdcReward: {
    type: Number,
    default: 0
  },
  badgeReward: {
    type: String,
    default: null
  },
  
  // Quest details
  estimatedDuration: {
    type: String,
    default: "1-2 hours"
  },
  tasks: [taskSchema],
  
  // Daily tasks (can be added/removed by admin)
  dailyTasks: [taskSchema],
  
  // Resources
  resources: [{
    title: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  
  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },
  
  maxParticipants: {
    type: Number,
    default: null // null = unlimited
  },
  
  // Stats
  totalParticipants: {
    type: Number,
    default: 0
  },
  totalCompletions: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  averageCompletionTime: {
    type: Number,
    default: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
questSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if quest is currently active based on dates
questSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  if (this.maxParticipants && this.totalParticipants >= this.maxParticipants) return false;
  
  return true;
};

module.exports = mongoose.model("Quest", questSchema);