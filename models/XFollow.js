// models/XFollow.js
const mongoose = require("mongoose");

const xFollowSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  iFollowed: {
    type: Boolean,
    default: false
  },
  theyFollowed: {
    type: Boolean,
    default: false
  },
  followedAt: {
    type: Date,
    default: null
  },
  mutualAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicates and improve query performance
xFollowSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });

module.exports = mongoose.model("XFollow", xFollowSchema);