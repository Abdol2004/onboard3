const mongoose = require('mongoose');

const businessTransactionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },

  type: {
    type:     String,
    enum:     ['fund', 'quest_creation', 'bounty_creation'],
    required: true
  },

  totalAmount:        { type: Number, required: true },
  poolAmount:         { type: Number, default: 0 },
  bdCommission:       { type: Number, default: 0 },
  platformCommission: { type: Number, default: 0 },

  bdCommissionRate:       { type: Number, default: 0 },
  platformCommissionRate: { type: Number, default: 0 },

  description: String,
  questId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Quest' },
  bountyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Bounty' },

  balanceBefore: Number,
  balanceAfter:  Number
}, { timestamps: true });

module.exports = mongoose.model('BusinessTransaction', businessTransactionSchema);
