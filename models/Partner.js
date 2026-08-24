const mongoose = require("mongoose");

const partnerProposalSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true
  },
  projectDescription: {
    type: String,
    required: true
  },
  projectWebsite: String,
  projectTwitter: String,
  projectType: {
    type: String,
    enum: ['quest_sponsor', 'event_sponsor', 'class_sponsor', 'general_partnership'],
    required: true
  },
  estimatedBudget: String,
  additionalNotes: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  commissionPaid: {
    type: Number,
    default: 0
  }
});

const partnerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Application status
  applicationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,

  // Partner details
  fullName: {
    type: String,
    required: true
  },
  telegramUsername: {
    type: String,
    required: true
  },
  phone: String,
  country: String,
  city: String,

  // Professional info
  experience: {
    type: String,
    enum: ['none', 'beginner', 'intermediate', 'expert'],
    default: 'beginner'
  },
  previousPartnerships: String,
  motivation: {
    type: String,
    required: true
  },

  // Business metrics
  totalProposals: {
    type: Number,
    default: 0
  },
  approvedProposals: {
    type: Number,
    default: 0
  },
  totalCommissionEarned: {
    type: Number,
    default: 0
  },
  pendingCommission: {
    type: Number,
    default: 0
  },

  // Project proposals
  proposals: [partnerProposalSchema],

  // Partner level/tier
  partnerTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },

  // Communication
  lastContactedAt: Date,
  notes: String,

  // Timestamps
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
partnerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries (userId already has unique index from schema)
partnerSchema.index({ applicationStatus: 1 });
partnerSchema.index({ 'proposals.status': 1 });

module.exports = mongoose.model("Partner", partnerSchema);
