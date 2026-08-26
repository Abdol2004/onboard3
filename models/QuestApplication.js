const mongoose = require('mongoose');
const questApplicationSchema = new mongoose.Schema({
  questId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Quest',  required: true },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  xHandle:          { type: String, trim: true },
  telegramUsername: { type: String, trim: true },
  status:           { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  rejectionReason:  { type: String },
  reviewedAt:       Date,
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
questApplicationSchema.index({ questId: 1, userId: 1 }, { unique: true });
questApplicationSchema.index({ questId: 1, status: 1 }); // participantCount query
module.exports = mongoose.model('QuestApplication', questApplicationSchema);
