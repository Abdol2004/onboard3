const mongoose = require('mongoose');

const bountyChallengeSchema = new mongoose.Schema({
  nonce:            { type: String, required: true, unique: true },
  message:          { type: String, required: true },
  submitterAddress: { type: String, required: true },
  partnerKeyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerApiKey', required: true },
  expiresAt:        { type: Date, required: true },
  isUsed:           { type: Boolean, default: false },
  usedAt:           { type: Date, default: null },
  createdAt:        { type: Date, default: Date.now }
});

// MongoDB TTL: auto-delete documents after expiresAt
bountyChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BountyChallenge', bountyChallengeSchema);
