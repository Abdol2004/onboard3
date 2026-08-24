require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const NAMES = ['bolacrypt','defioyin','luckee','ragnarOxtim','ragnar','zyra','ghost','royal bliss','royalbliss','trae','promzy','promzy10','obasalopi','imxihab','levrone','cynthia','moreal'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const results = await User.find({
    username: { $regex: new RegExp(NAMES.map(n => `^${n.replace(/ /g,'[\\s_]*')}$`).join('|'), 'i') }
  }).select('username xp walletAddress lastLogin twitter email').lean();

  // Also search for partial matches
  const partial = await User.find({
    username: { $regex: new RegExp(NAMES.join('|'), 'i') }
  }).select('username xp walletAddress lastLogin twitter email').lean();

  const all = [...new Map([...results,...partial].map(u => [u._id.toString(), u])).values()];
  all.sort((a,b) => (b.xp||0)-(a.xp||0));

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7*24*3600*1000);

  console.log('\n  USERNAME'.padEnd(24) + 'XP'.padStart(12) + '  ACTIVE?  WALLET?  X HANDLE');
  console.log('─'.repeat(90));
  for (const u of all) {
    const active = u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo ? 'YES' : 'no';
    const wallet = u.walletAddress ? '✅' : '❌';
    const tw = u.twitter ? `@${u.twitter}` : '(none)';
    console.log(`  @${u.username.padEnd(22)} ${(u.xp||0).toLocaleString().padStart(10)}  ${active.padEnd(6)}  ${wallet}  ${tw}`);
  }

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
