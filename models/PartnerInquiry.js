const mongoose = require('mongoose');

const partnerInquirySchema = new mongoose.Schema({
  projectName:     { type: String, required: true },
  email:           { type: String, required: true },
  website:         { type: String, default: '' },
  telegram:        { type: String, default: '' },
  partnershipType: { type: String, required: true },
  description:     { type: String, required: true },
  budget:          { type: String, default: '' },
  timeline:        { type: String, default: '' },
  status:          { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  submittedAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('PartnerInquiry', partnerInquirySchema);
