const mongoose = require('mongoose');

const welcomeQuestProgressSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dismissed:    { type: Boolean, default: false },
  dismissedAt:  { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('WelcomeQuestProgress', welcomeQuestProgressSchema);
