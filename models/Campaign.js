const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: {
    type: String, required: true,
    enum: ['twitter_follow','twitter_like','twitter_retweet','twitter_quote','twitter_comment','twitter_post',
           'discord_join','telegram_join','youtube_subscribe','youtube_like',
           'instagram_follow','tiktok_follow','visit_url','download_app','other']
  },
  title:       { type: String, required: true },
  description: { type: String },
  url:         { type: String },
  xpReward:    { type: Number, default: 50 },
  order:       { type: Number, default: 0 },
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  coverImage:  { type: String },
  sponsor: {
    name:    { type: String, required: true },
    logo:    { type: String },
    website: { type: String },
    twitter: { type: String },
  },
  tasks:          { type: [taskSchema], default: [] },
  status:         { type: String, enum: ['draft','active','ended'], default: 'draft' },
  requiresReview: { type: Boolean, default: false },
  startDate:      { type: Date },
  endDate:        { type: Date },
  maxParticipants:  { type: Number, default: 0 },
  participantCount: { type: Number, default: 0 },
  totalXpReward:    { type: Number, default: 0 },
}, { timestamps: true });

campaignSchema.pre('save', function(next) {
  this.totalXpReward = (this.tasks || []).reduce((s, t) => s + (t.xpReward || 0), 0);
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
