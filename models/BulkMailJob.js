const mongoose = require('mongoose');

const BulkMailJobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['idle', 'running', 'paused', 'completed', 'limit_reached'],
    default: 'idle'
  },
  currentIndex:     { type: Number, default: 0 },
  totalRecipients:  { type: Number, default: 0 },
  sentCount:        { type: Number, default: 0 },
  failedCount:      { type: Number, default: 0 },
  recentActivity: [{
    email:     String,
    username:  String,
    status:    { type: String, enum: ['sent', 'failed'] },
    account:   String,
    error:     String,
    timestamp: { type: Date, default: Date.now }
  }],
  accountUsage: [{
    email:     String,
    name:      String,
    sentToday: { type: Number, default: 0 },
    totalSent: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  }],
  comingSoonMode: { type: Boolean, default: true },
  startedAt:      Date,
  completedAt:    Date,
  lastTickAt:     Date
}, { timestamps: true });

module.exports = mongoose.models.BulkMailJob || mongoose.model('BulkMailJob', BulkMailJobSchema);
