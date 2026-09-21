const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyCohort', required: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name:             { type: String, required: true },
  email:            { type: String, required: true },
  xUsername:        { type: String },
  telegramUsername: { type: String },
  experienceLevel:  { type: String, enum: ['beginner','intermediate','advanced'], default: 'beginner' },
  motivation:       { type: String, required: true },
  goal:             { type: String, required: true },
  hoursPerWeek:     { type: String, enum: ['<5','5-10','10+'] },
  willingToComplete:{ type: Boolean, default: true },
  challengeAnswer:  { type: String },

  status: {
    type: String,
    enum: ['applied','under_review','accepted','waitlisted','rejected'],
    default: 'applied'
  },
  reviewNote: { type: String },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdAt: { type: Date, default: Date.now }
});

applicationSchema.index({ cohortId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AcademyApplication', applicationSchema);
