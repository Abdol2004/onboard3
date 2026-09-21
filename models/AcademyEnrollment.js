const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  week:          { type: Number },
  submissionUrl: { type: String },
  submittedAt:   { type: Date, default: Date.now }
}, { _id: false });

const enrollmentSchema = new mongoose.Schema({
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyCohort', required: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  attendanceWeeks:      [{ type: Number }],
  assignmentsCompleted: { type: Number, default: 0 },
  assignmentSubmissions: [submissionSchema],

  status: {
    type: String,
    enum: ['active','completed','graduated','dropped'],
    default: 'active'
  },

  graduatedAt:   { type: Date },
  certificateId: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

enrollmentSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });
enrollmentSchema.index({ cohortId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AcademyEnrollment', enrollmentSchema);
