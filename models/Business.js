const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },
  email:       { type: String, trim: true, lowercase: true },
  phone:       String,
  description: { type: String, maxlength: 1000 },
  website:     String,
  logo:        String,
  industry: {
    type:    String,
    enum:    ['tech', 'defi', 'nft', 'gaming', 'social', 'infrastructure', 'dao', 'other'],
    default: 'other'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessDeveloper', default: null },

  status: {
    type:    String,
    enum:    ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedAt:      Date,
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,

  balance:      { type: Number, default: 0 },
  totalFunded:  { type: Number, default: 0 },
  totalSpent:   { type: Number, default: 0 },

  quests:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],
  bounties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bounty' }],

  lastLogin: Date
}, { timestamps: true });

businessSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

businessSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Business', businessSchema);
