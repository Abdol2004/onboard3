require('dotenv').config();
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('DB connected\n');

  await Campaign.deleteMany({});
  console.log('Cleared existing campaigns\n');

  const campaign = await Campaign.create({
    title: 'ONBOARD3 Community Growth Campaign',
    description: 'Help grow the ONBOARD3 community by completing social tasks. Follow us, engage with our content, and join our channels to earn XP rewards.',
    coverImage: '',
    sponsor: {
      name: 'ONBOARD3',
      logo: '/img/logo.png',
      website: 'https://onboard3.xyz',
      twitter: 'onboard3xyz',
    },
    status: 'active',
    requiresReview: false,
    endDate: new Date('2026-12-31'),
    maxParticipants: 0,
    tasks: [
      {
        type: 'twitter_follow',
        title: 'Follow us on X',
        description: 'Follow @onboard3xyz on X (Twitter). Enter your X username as proof.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 50,
        order: 0,
      },
      {
        type: 'twitter_like',
        title: 'Like our pinned post',
        description: 'Like our pinned post on X. Enter your X username as proof.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 50,
        order: 1,
      },
      {
        type: 'twitter_comment',
        title: 'Comment on our pinned post',
        description: 'Leave a comment on our pinned post. Paste the link to your comment as proof.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 100,
        order: 2,
      },
      {
        type: 'twitter_retweet',
        title: 'Retweet our pinned post',
        description: 'Retweet our pinned post to your followers. Enter your X username as proof.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 100,
        order: 3,
      },
      {
        type: 'twitter_quote',
        title: 'Quote tweet our post',
        description: 'Quote retweet our pinned post and say why you joined ONBOARD3. Paste the link to your quote tweet as proof.',
        url: 'https://x.com/onboard3xyz',
        xpReward: 150,
        order: 4,
      },
      {
        type: 'twitter_post',
        title: 'Post about ONBOARD3',
        description: 'Write an original post about ONBOARD3. Tag @onboard3xyz and use #ONBOARD3. Paste the link to your post as proof.',
        url: '',
        xpReward: 200,
        order: 5,
      },
      {
        type: 'discord_join',
        title: 'Join our Discord',
        description: 'Join the ONBOARD3 Discord server and introduce yourself in #introductions. Enter your Discord username as proof.',
        url: 'https://discord.gg/onboard3',
        xpReward: 100,
        order: 6,
      },
      {
        type: 'telegram_join',
        title: 'Join our Telegram',
        description: 'Join the official ONBOARD3 Telegram channel. Enter your Telegram username as proof.',
        url: 'https://t.me/onboard3xyz',
        xpReward: 50,
        order: 7,
      },
    ],
  });

  console.log(`Created: "${campaign.title}"`);
  console.log(`Tasks:   ${campaign.tasks.length}`);
  console.log(`Total XP: ${campaign.totalXpReward}`);
  console.log('\nTask breakdown:');
  campaign.tasks.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.type}] ${t.title} — ${t.xpReward} XP`);
  });

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
