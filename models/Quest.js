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
    enum: ['social', 'submission', 'verification', 'quiz', 'external'],
    default: 'submission'
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
    platform: String, // 'twitter', 'telegram', 'discord', etc.
    action: String // 'follow', 'join', 'like', 'retweet', etc.
  },
  validationUrl: {
    type: String // URL for validation/submission
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
  questType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'permanent', 'special'],
    default: 'permanent'
  },
  // Rewards
  xpReward: {
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
    type: String, // e.g., "2-3 hours"
    default: "1-2 hours"
  },
  tasks: [taskSchema],
  // Resources
  resources: [{
    title: { type: String },
    url: { type: String },
    type: { type: String } // 'documentation', 'video', 'article', 'code'
  }],
  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null // null means no end date
  },
  maxCompletions: {
    type: Number,
    default: null // null means unlimited
  },
  // Stats
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
    default: 0 // in minutes
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

module.exports = mongoose.model("Quest", questSchema);
