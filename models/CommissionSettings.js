const mongoose = require('mongoose');

const commissionSettingsSchema = new mongoose.Schema({
  bdCommissionRate:       { type: Number, default: 10, min: 0, max: 100 },
  platformCommissionRate: { type: Number, default: 5,  min: 0, max: 100 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

commissionSettingsSchema.statics.getCurrent = async function () {
  let s = await this.findOne().sort({ createdAt: -1 });
  if (!s) s = await this.create({});
  return s;
};

module.exports = mongoose.model('CommissionSettings', commissionSettingsSchema);
