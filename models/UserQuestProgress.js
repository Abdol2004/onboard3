const mongoose = require("mongoose");

const taskProgressSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  submissionUrl: String,
  submissionText: String,
  submissionData: mongoose.Schema.Types.Mixed,
  completedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  notes: String
});

const userQuestProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quest',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
    default: 'not_started'
  },
  progress: {
    type: Number,
    default: 0 // percentage 0-100
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  totalTasks: {
    type: Number,
    required: true
  },
  taskProgress: [taskProgressSchema],
  // Timing
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  timeSpentMinutes: {
    type: Number,
    default: 0
  },
  // Rewards tracking
  xpEarned: {
    type: Number,
    default: 0
  },
  usdcEarned: {
    type: Number,
    default: 0
  },
  badgeEarned: {
    type: String,
    default: null
  },
  rewardsClaimed: {
    type: Boolean,
    default: false
  },
  // NEW: Track if user won (for FCFS and Competition)
  isWinner: {
    type: Boolean,
    default: false
  },
  winnerRank: {
    type: Number,
    default: null
  },
  // Notes and feedback
  userNotes: String,
  feedbackRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedbackText: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique user-quest combination
userQuestProgressSchema.index({ userId: 1, questId: 1 }, { unique: true });

// Update timestamp on save
userQuestProgressSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("UserQuestProgress", userQuestProgressSchema);
