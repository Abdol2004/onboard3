const mongoose = require('mongoose');

const launchRewardSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:      { type: String, required: true },
  walletAddress: { type: String, default: null },
  amount:        { type: Number, required: true },
  tier:          { type: String, required: true },
  xp:            { type: Number, default: 0 },
  twitterHandle: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'skipped_no_wallet'],
    default: 'pending'
  },
  txSignature:   { type: String, default: null },
  failReason:    { type: String, default: null },
  sentAt:        { type: Date, default: null },
  notified:      { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now }
}, { collection: 'launch_rewards' });

launchRewardSchema.index({ userId: 1 }, { unique: true });
launchRewardSchema.index({ status: 1 });

module.exports = mongoose.model('LaunchReward', launchRewardSchema);
