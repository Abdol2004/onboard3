const mongoose = require('mongoose');

const businessFundRequestSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },

  amount:          { type: Number, required: true, min: 1 },
  token:           { type: String, enum: ['USDC', 'USDT'], required: true },
  network:         { type: String, enum: ['solana', 'bnb', 'erc20'], required: true },
  walletAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletAddress' },
  screenshotPath:  { type: String }, // relative URL served from /uploads/fund-screenshots/
  proofNote:       { type: String, maxlength: 1000 },

  status: {
    type:    String,
    enum:    ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedAt:      Date,
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  adminNote:       String
}, { timestamps: true });

module.exports = mongoose.model('BusinessFundRequest', businessFundRequestSchema);
