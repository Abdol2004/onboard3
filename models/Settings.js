const mongoose = require('mongoose');
const settingsSchema = new mongoose.Schema({
    twitterRequired: { type: Boolean, default: false },
    emailVerification: { type: Boolean, default: true },
    emailProvider: { type: String, enum: ['resend', 'gmail'], default: 'resend' },
    updatedAt: { type: Date, default: Date.now }
});
settingsSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Settings', settingsSchema);
