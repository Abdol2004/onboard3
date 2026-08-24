const mongoose = require('mongoose');

const bdEarningSchema = new mongoose.Schema({
  bdId:          { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessDeveloper', required: true },
  businessId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessTransaction' },

  type: {
    type:     String,
    enum:     ['quest_commission', 'bounty_commission'],
    required: true
  },

  grossAmount:      Number,
  commissionRate:   Number,
  commissionAmount: Number,

  status: {
    type:    String,
    enum:    ['pending', 'paid'],
    default: 'pending'
  },
  paidAt: Date
}, { timestamps: true });

module.exports = mongoose.model('BDEarning', bdEarningSchema);
