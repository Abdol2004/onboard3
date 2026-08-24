const mongoose = require('mongoose');

const sponsoredSubmissionSchema = new mongoose.Schema({
  bountyId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Bounty', required: true },
  partnerKeyId:         { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerApiKey', required: true },
  submitterAddress:     { type: String, required: true },
  submitterUserId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Signed transaction from user's Stacks wallet (origin signer)
  originSignedTxHex:    { type: String, required: true },
  signedChallenge:      { type: String, required: true },
  challengeNonce:       { type: String, required: true },

  // Submission content
  summary:              { type: String, default: null },
  submissionUrl:        { type: String, default: null },
  externalSubmissionId: { type: String, default: null },

  // Deduplication
  idempotencyKey:       { type: String, default: null },

  // Broadcast lifecycle
  status:               { type: String, enum: ['pending', 'broadcast', 'failed'], default: 'pending' },
  txid:                 { type: String, default: null },
  broadcastAt:          { type: Date, default: null },
  failureReason:        { type: String, default: null },

  createdAt:            { type: Date, default: Date.now }
});

// Unique idempotency per partner key (only when key is provided)
sponsoredSubmissionSchema.index(
  { partnerKeyId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $ne: null } } }
);

// Unique external submission ID per partner key (when provided)
sponsoredSubmissionSchema.index(
  { partnerKeyId: 1, externalSubmissionId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('SponsoredBountySubmission', sponsoredSubmissionSchema);
