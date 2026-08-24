const mongoose = require('mongoose');

// Singleton — only ever one document. Use PlatformSettings.get() to read.
const platformSettingsSchema = new mongoose.Schema({
  // Apeit wallet integration
  apeitWalletUrl:   { type: String, default: 'https://apeitwallet.io' },

  // Withdrawal config
  withdrawalMin:    { type: Number, default: 5 },

  // Fee tiers: { upTo: null means "everything above prev tier" }
  feeTierSmall:     { type: Number, default: 1 },    // amount < 10
  feeTierSmallUpTo: { type: Number, default: 10 },
  feeTierMedium:    { type: Number, default: 2 },    // amount 10-50
  feeTierMediumUpTo:{ type: Number, default: 50 },
  feeTierLarge:     { type: Number, default: 3.5 },  // amount > 50

  updatedAt: { type: Date, default: Date.now }
}, { collection: 'platform_settings' });

platformSettingsSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

// Always returns the singleton, creates it if missing
platformSettingsSchema.statics.get = async function() {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

// Compute fee for a given amount using the stored tiers
platformSettingsSchema.methods.computeFee = function(amount) {
  if (amount < this.feeTierSmallUpTo) return this.feeTierSmall;
  if (amount <= this.feeTierMediumUpTo) return this.feeTierMedium;
  return this.feeTierLarge;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
