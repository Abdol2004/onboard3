const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  campaign:    { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskIndex:   { type: Number, required: true },
  taskType:    { type: String },
  proofUrl:    { type: String },
  proofHandle: { type: String },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'approved' },
  xpAwarded:   { type: Number, default: 0 },
  adminNotes:  { type: String },
  reviewedAt:  { type: Date },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

submissionSchema.index({ campaign: 1, user: 1, taskIndex: 1 }, { unique: true });

module.exports = mongoose.model('CampaignSubmission', submissionSchema);
