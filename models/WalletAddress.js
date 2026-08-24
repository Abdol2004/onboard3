const mongoose = require('mongoose');

const walletAddressSchema = new mongoose.Schema({
  token:    { type: String, enum: ['USDC', 'USDT'], required: true },
  network:  { type: String, enum: ['solana', 'bnb', 'erc20'], required: true },
  address:  { type: String, required: true, trim: true },
  label:    { type: String, trim: true }, // e.g. "Solana USDC (SPL)"
  isActive: { type: Boolean, default: true },
  addedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index — one active address per token+network combo
walletAddressSchema.index({ token: 1, network: 1 });

module.exports = mongoose.model('WalletAddress', walletAddressSchema);
