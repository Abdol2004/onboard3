const mongoose = require('mongoose');

const welcomeTaskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  link:        { type: String, default: null },   // optional CTA link
  linkLabel:   { type: String, default: 'Go' },   // button label
  xpReward:    { type: Number, default: 50 },
  usdcReward:  { type: Number, default: 0 },
  order:       { type: Number, default: 0 }
}, { _id: true });

const welcomeQuestSchema = new mongoose.Schema({
  title:       { type: String, default: 'Welcome to ONBOARD3' },
  description: { type: String, default: 'Complete these tasks to get started and earn your first rewards.' },
  teaser:      { type: String, default: 'Earn XP and USDC just for getting started!' },
  tasks:       [welcomeTaskSchema],
  isActive:    { type: Boolean, default: true },
  updatedAt:   { type: Date, default: Date.now }
}, { collection: 'welcome_quest' });

welcomeQuestSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

// Singleton helper
welcomeQuestSchema.statics.get = async function() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({
      title: 'Welcome to ONBOARD3',
      description: 'Complete these tasks to unlock your rewards and start earning.',
      teaser: 'Earn XP and USDC just for getting started!',
      tasks: [
        { title: 'Follow us on X (Twitter)', description: 'Stay updated with the latest news and announcements.', link: 'https://x.com/onboard3___', linkLabel: 'Follow', xpReward: 100, usdcReward: 0, order: 0 },
        { title: 'Join our Telegram', description: 'Connect with the ONBOARD3 community on Telegram.', link: 'https://t.me/onboard_3', linkLabel: 'Join', xpReward: 100, usdcReward: 0, order: 1 },
        { title: 'Complete your profile', description: 'Add your wallet address and bio to your profile.', link: '/dashboard/settings', linkLabel: 'Set up', xpReward: 150, usdcReward: 0, order: 2 }
      ],
      isActive: true
    });
  }
  return doc;
};

module.exports = mongoose.model('WelcomeQuest', welcomeQuestSchema);
