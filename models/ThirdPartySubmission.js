const mongoose = require('mongoose');

const thirdPartySubmissionSchema = new mongoose.Schema({
  platform:         { type: String, default: 'zeroauthoritydao' },
  externalBountyId: { type: String, required: true },  // ZAD bounty UUID
  bountyName:       { type: String },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  summary:          { type: String, required: true },
  submissionUrl:    { type: String, default: null },
  zadSubmissionId:  { type: String, default: null },    // confirmed ZAD submission ID if proxied successfully
  status:           { type: String, enum: ['pending', 'submitted', 'winner'], default: 'pending' },
  createdAt:        { type: Date, default: Date.now }
});

// One submission per user per external bounty
thirdPartySubmissionSchema.index({ externalBountyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ThirdPartySubmission', thirdPartySubmissionSchema);
