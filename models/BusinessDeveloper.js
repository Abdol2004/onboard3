const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessDeveloperSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone:    { type: String, trim: true },
  bio:      { type: String, maxlength: 500 },

  referralCode: { type: String, unique: true, sparse: true },

  status: {
    type:    String,
    enum:    ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedAt:      Date,
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,

  commissionRate: { type: Number, default: null }, // null = use global CommissionSettings

  totalEarned:    { type: Number, default: 0 },
  pendingEarnings:{ type: Number, default: 0 },
  paidEarnings:   { type: Number, default: 0 },

  businesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],

  lastLogin: Date
}, { timestamps: true });

businessDeveloperSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (!this.referralCode) {
    const prefix = (this.name || 'BD').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    this.referralCode = 'BD' + prefix + suffix;
  }
  next();
});

businessDeveloperSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('BusinessDeveloper', businessDeveloperSchema);
