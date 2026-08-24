require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const r = await User.find({ username: { $regex: /zyra|ragnar/i } })
    .select('username xp walletAddress lastLogin twitter').lean();
  const now = new Date(), sda = new Date(now - 7*24*3600*1000);
  r.sort((a,b)=>(b.xp||0)-(a.xp||0));
  console.log('--- ZYRA / RAGNAR ---');
  r.forEach(u => {
    const active = u.lastLogin && new Date(u.lastLogin) >= sda ? 'ACTIVE' : 'inactive';
    console.log('@'+u.username.padEnd(24), (u.xp||0).toString().padStart(8), active, u.walletAddress?'✅':'❌', u.twitter?'@'+u.twitter:'(no X)');
  });
  await mongoose.disconnect();
});
