// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['quest_reward', 'referral_bonus', 'withdrawal', 'admin_adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected', 'cancelled'],
    default: 'completed'
  },
  // For withdrawals
  walletAddress: {
    type: String,
    default: null
  },
  // Reference to quest if applicable
  questId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quest',
    default: null
  },
  questTitle: {
    type: String,
    default: null
  },
  // Admin notes
  notes: {
    type: String,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  // Transaction hash (for on-chain withdrawals)
  txHash: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);