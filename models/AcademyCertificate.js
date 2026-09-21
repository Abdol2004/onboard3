const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true }, // OA-2026-001
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cohortId:      { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyCohort', required: true },
  enrollmentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyEnrollment' },

  username:    { type: String },
  cohortTitle: { type: String },
  cohortTopic: { type: String },

  issuedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AcademyCertificate', certificateSchema);
