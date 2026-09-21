require('dotenv').config();
const mongoose = require('mongoose');
const Quest = require('../models/Quest');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const quest = await Quest.findOne({ title: /apex/i });
  if (!quest) {
    console.error('❌ No quest with "Apex" in the title found.');
    process.exit(1);
  }

  console.log('Found quest:', quest.title, '(' + quest._id + ')');

  quest.prizeDistribution = [
    { from: 1,  to: 3,  amount: 50 },
    { from: 4,  to: 5,  amount: 30 },
    { from: 6,  to: 15, amount: 15 },
    { from: 16, to: 25, amount: 10 },
    { from: 26, to: 30, amount: 8  }
  ];

  await quest.save();
  console.log('✅ Prize distribution set on:', quest.title);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
