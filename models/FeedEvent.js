const mongoose = require('mongoose');

const feedEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['role_upgrade', 'usdc_earned', 'quest_completed'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: { type: String, required: true },
  data: {
    oldRole:    { type: String, default: null },
    newRole:    { type: String, default: null },
    amount:     { type: Number, default: null },
    questTitle: { type: String, default: null }
  },
  likes: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  createdAt: { type: Date, default: Date.now }
});

feedEventSchema.index({ createdAt: -1 });
feedEventSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('FeedEvent', feedEventSchema);
