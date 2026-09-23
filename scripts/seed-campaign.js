require('dotenv').config();
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('DB connected');

  await Campaign.deleteOne({ title: 'ONBOARD3 Launch Campaign' });

  const campaign = await Campaign.create({
    title: 'ONBOARD3 Launch Campaign',
    description: 'Help us grow the ONBOARD3 community! Complete social tasks to earn XP and show your support for the ecosystem.',
    coverImage: '',
    sponsor: {
      name: 'ONBOARD3',
      logo: '/img/logo.png',
      website: 'https://onboard3.xyz',
      twitter: 'onboard3xyz',
    },
    status: 'active',
    requiresReview: false,
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    maxParticipants: 0,
    tasks: [
      {
        type: 'twitter_follow',
        title: 'Follow ONBOARD3 on X',
        description: 'Follow our official X (Twitter) account to stay updated on the latest news and opportunities.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 100,
        order: 0,
      },
      {
        type: 'twitter_retweet',
        title: 'Retweet our latest post',
        description: 'Retweet our pinned post to spread the word about ONBOARD3 to your network.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 150,
        order: 1,
      },
      {
        type: 'twitter_post',
        title: 'Post about ONBOARD3',
        description: 'Share a post about your experience with ONBOARD3. Use the hashtag #ONBOARD3 and tag @onboard3xyz.',
        url: '',
        xpReward: 250,
        order: 2,
      },
      {
        type: 'discord_join',
        title: 'Join our Discord server',
        description: 'Join the ONBOARD3 Discord community to connect with other Web3 learners and builders.',
        url: 'https://discord.gg/onboard3',
        xpReward: 200,
        order: 3,
      },
      {
        type: 'telegram_join',
        title: 'Join our Telegram channel',
        description: 'Join the ONBOARD3 Telegram channel for announcements and community updates.',
        url: 'https://t.me/onboard3',
        xpReward: 100,
        order: 4,
      },
    ],
  });

  console.log('Campaign created:', campaign.title);
  console.log('Total XP:', campaign.totalXpReward);
  console.log('Tasks:', campaign.tasks.length);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
