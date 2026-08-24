const mongoose = require('mongoose');

// Fixed tasks — taskId stays stable (used by frontend JS gate logic)
const taskSchema = new mongoose.Schema({
  taskId:   { type: String, required: true },
  step:     { type: Number, required: true },
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  link:     { type: String, default: '' },
  btnLabel: { type: String, default: 'Go' },
  order:    { type: Number, default: 0 }
}, { _id: false });

// Extra tasks — admin-added, rendered after fixed tasks, never gate-block progression
const extraTaskSchema = new mongoose.Schema({
  step:     { type: Number, required: true },
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  link:     { type: String, default: '' },
  btnLabel: { type: String, default: 'Go' },
  order:    { type: Number, default: 99 }
});

const onboardingConfigSchema = new mongoose.Schema({
  step4Title:   { type: String, default: 'Connect your Solana Wallet' },
  step4Desc:    { type: String, default: "Connect any Solana wallet (Phantom, Backpack, Solflare, etc.) to receive USDC rewards. Copy your Solana USDC address and paste it in Settings." },
  step4ShareTitle:   { type: String, default: 'Share your wallet setup on X' },
  step4ShareSubtitle:{ type: String, default: 'Tag @onboard3___ to spread the word' },

  step5Title:   { type: String, default: 'Discover EyeCoin' },
  step5Eyebrow: { type: String, default: 'Partner Quest' },
  step5Desc:    { type: String, default: 'EyeCoin is a play-to-earn game on Telegram. Play, join a team, and earn — all from your phone.' },

  tasks:      [taskSchema],
  extraTasks: [extraTaskSchema],

  pathwayApprovalMode: { type: String, enum: ['auto', 'manual'], default: 'manual' },

  updatedAt: { type: Date, default: Date.now }
}, { collection: 'onboarding_config' });

onboardingConfigSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

onboardingConfigSchema.statics.get = async function() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({
      tasks: [
        // Step 3
        { taskId:'t-x1',          step:3, title:'Follow @onboard3___',          subtitle:'Our main X account — quest drops, updates & spaces',     link:'https://x.com/onboard3___',   btnLabel:'Follow',   order:0 },
        { taskId:'t-x2',          step:3, title:'Follow @beebrain123',           subtitle:'Founder of ONBOARD3 — Web3 insights & alpha',            link:'https://x.com/beebrain123',   btnLabel:'Follow',   order:1 },
        { taskId:'t-tg',          step:3, title:'Join @onboard_3 on Telegram',   subtitle:'Our community hub — announcements, quests & giveaways',   link:'https://t.me/onboard_3',      btnLabel:'Join',     order:2 },
        // Step 4
        { taskId:'t-sol-download',step:4, title:'Download Apeit Wallet',         subtitle:'Available for iOS and Android',                           link:'https://apeitwallet.io',      btnLabel:'Download', order:0 },
        { taskId:'t-sol-follow',  step:4, title:'Follow Apeit on X',             subtitle:'Stay updated with Apeit Wallet features and tips',        link:'https://x.com/apeitwallet',   btnLabel:'Follow',   order:1 },
        { taskId:'t-sol-share',   step:4, title:'Share your Apeit Wallet setup on X', subtitle:'Tag @apeitwallet and @onboard3___ to spread the word', link:'https://x.com/intent/tweet', btnLabel:'Share',   order:2 },
        // Step 5
        { taskId:'t-eye-channel', step:5, title:'Join EyeCoin Channel',          subtitle:'@geteyecoinann — official announcements',                 link:'https://t.me/geteyecoinann',  btnLabel:'Join',     order:0 },
        { taskId:'t-eye-group',   step:5, title:'Join EyeCoin Community Group',  subtitle:'@geteyecoinnow — find a team and start earning',          link:'https://t.me/geteyecoinnow',  btnLabel:'Join',     order:1 },
        { taskId:'t-eye-x',       step:5, title:'Follow @eyecoinHQ on X',        subtitle:'Game updates, tournaments & community news',              link:'https://x.com/eyecoinHQ',     btnLabel:'Follow',   order:2 },
      ],
      extraTasks: []
    });
  }
  return doc;
};

module.exports = mongoose.model('OnboardingConfig', onboardingConfigSchema);
