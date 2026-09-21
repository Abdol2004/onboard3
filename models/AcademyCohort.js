const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, required: true },
  type: { type: String, enum: ['pdf','doc','link','video','image','slides','template','other'], default: 'link' }
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title:       { type: String },
  description: { type: String },
  deadline:    { type: Date },
  required:    { type: Boolean, default: false }
}, { _id: false });

const dayScheduleSchema = new mongoose.Schema({
  day:      { type: String },
  activity: { type: String }
}, { _id: false });

const weekSchema = new mongoose.Schema({
  week:        { type: Number, required: true },
  theme:       { type: String },
  topics:      [{ type: String }],
  daySchedule: [dayScheduleSchema],
  resources:   [resourceSchema],
  assignment:  assignmentSchema
}, { _id: false });

const instructorSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  bio:    { type: String },
  twitter:{ type: String },
  avatar: { type: String }
}, { _id: false });

const cohortSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  topic:       { type: String },
  duration:    { type: String },
  image:       { type: String },

  instructors: [instructorSchema],

  startDate:            { type: Date },
  endDate:              { type: Date },
  applicationDeadline:  { type: Date },

  seats: { type: Number, default: 50 },

  status: {
    type: String,
    enum: ['draft','applications_open','applications_closed','active','ended'],
    default: 'draft'
  },

  weeklySchedule:   [weekSchema],
  requirements:     { type: String },
  whatYoullLearn:   [{ type: String }],
  admissionChallenge: { type: String },

  telegramGroupLink:   { type: String },
  telegramChannelLink: { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

cohortSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('AcademyCohort', cohortSchema);
