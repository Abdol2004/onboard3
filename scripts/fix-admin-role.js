require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  // Show all admin users and their roles
  const admins = await User.find({ isAdmin: true }).select('username email adminRole').lean();
  console.log('\nAll admin users:');
  admins.forEach(u => {
    console.log(`  @${u.username} (${u.email}) → adminRole: ${JSON.stringify(u.adminRole)}`);
  });

  // Fix: set ibnmarzuk207@gmail.com to operations
  const target = await User.findOne({ email: 'ibnmarzuk207@gmail.com' });
  if (!target) { console.log('\nUser not found'); return process.exit(1); }

  console.log(`\nBefore: @${target.username} adminRole = ${JSON.stringify(target.adminRole)}`);
  target.adminRole = 'operations';
  await target.save();
  console.log(`After:  @${target.username} adminRole = ${JSON.stringify(target.adminRole)}`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
