const mongoose = require('mongoose');
const crypto = require('crypto');

const partnerApiKeySchema = new mongoose.Schema({
  name:             { type: String, required: true },
  keyHash:          { type: String, required: true, unique: true },
  keyPrefix:        { type: String, required: true },
  allowedBounties:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bounty' }],
  isActive:         { type: Boolean, default: true },
  notes:            { type: String, default: '' },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUsedAt:       { type: Date, default: null },
  createdAt:        { type: Date, default: Date.now }
});

partnerApiKeySchema.statics.generate = function(name, createdBy, allowedBounties = []) {
  const rawKey  = 'psk_' + crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12);
  return { rawKey, doc: { name, keyHash, keyPrefix, allowedBounties, createdBy } };
};

partnerApiKeySchema.statics.findByKey = function(rawKey) {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return this.findOne({ keyHash, isActive: true });
};

module.exports = mongoose.model('PartnerApiKey', partnerApiKeySchema);
