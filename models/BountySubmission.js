const mongoose = require('mongoose');

const bountySubmissionSchema = new mongoose.Schema({
  bountyId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Bounty', required: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:         { type: String, required: true },
  description:   { type: String, required: true },
  submissionUrl: { type: String, default: null },
  status:        { type: String, enum: ['pending', 'winner', 'rejected'], default: 'pending' },
  rank:          { type: Number, default: null },
  amountWon:     { type: Number, default: null },
  createdAt:     { type: Date, default: Date.now }
});

// One submission per user per bounty
bountySubmissionSchema.index({ bountyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('BountySubmission', bountySubmissionSchema);
