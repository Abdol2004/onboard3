const mongoose = require('mongoose');

const rewardSplitSchema = new mongoose.Schema({
  rank:       { type: Number, required: true },   // 1, 2, 3...
  label:      { type: String, required: true },   // "1st Place", "2nd Place"
  percentage: { type: Number, required: true },   // % of pool
  amount:     { type: Number, default: 0 }        // calculated: pool * percentage / 100
}, { _id: false });

const winnerSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BountySubmission' },
  rank:         { type: Number },
  amountWon:    { type: Number }
}, { _id: false });

const bountySchema = new mongoose.Schema({
  title:            { type: String, required: true },
  shortDescription: { type: String, required: true },
  description:      { type: String, required: true },
  image:            { type: String, default: null },
  category:         { type: String, enum: ['development', 'design', 'marketing', 'content', 'community', 'other'], default: 'other' },

  rewardPool:     { type: Number, default: 0 },
  rewardToken:    { type: String, default: 'USDC' },
  rewardSplit:    [rewardSplitSchema],

  startDate: { type: Date, default: null },
  endDate:   { type: Date, default: null },

  status: {
    type: String,
    enum: ['draft', 'active', 'ended', 'winners_announced'],
    default: 'draft'
  },
  isActive: { type: Boolean, default: false },

  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvalNote: { type: String, default: '' },

  maxSubmissionsPerUser: { type: Number, default: 1 },
  totalSubmissions:      { type: Number, default: 0 },

  winners: [winnerSchema],

  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sponsoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bountySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  // Auto-calculate amounts from pool + percentages
  if (this.rewardPool > 0 && this.rewardSplit.length > 0) {
    this.rewardSplit.forEach(split => {
      split.amount = Math.round((this.rewardPool * split.percentage / 100) * 100) / 100;
    });
  }
  next();
});

bountySchema.methods.hasEnded = function() {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
};

bountySchema.methods.isLive = function() {
  const now = new Date();
  if (!this.isActive) return false;
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

module.exports = mongoose.model('Bounty', bountySchema);
