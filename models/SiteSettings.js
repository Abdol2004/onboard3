// models/SiteSettings.js - Singleton model for global site settings
const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  twitterRequired: {
    type: Boolean,
    default: true
  },
  emailProvider: {
    type: String,
    enum: ['resend', 'gmail'],
    default: 'resend'
  },
  emailVerificationRequired: {
    type: Boolean,
    default: true
  },
  emailStats: {
    lastSentAt:     { type: Date,   default: null },
    lastSentTo:     { type: String, default: null },
    lastStatus:     { type: String, enum: ['success', 'failed', null], default: null },
    lastError:      { type: String, default: null },
    totalSent:      { type: Number, default: 0 },
    totalFailed:    { type: Number, default: 0 }
  }
}, { timestamps: true });

// Always return the single settings document, creating it if it doesn't exist
siteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
