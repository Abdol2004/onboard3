require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Check all collections for raiders
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c=>c.name).join(', '));

  // Quest ID
  const quest = await db.collection('quests').findOne({ slug: 'apex-raiders' });
  if (!quest) { console.log('No apex-raiders quest'); await mongoose.disconnect(); return; }
  console.log('\nQuest ID:', quest._id);

  // Check quest_applications
  const apps = await db.collection('quest_applications').find({ quest: quest._id }).toArray();
  console.log('quest_applications:', apps.length);

  // Check userquestprogresses
  const progs = await db.collection('userquestprogresses').find({ quest: quest._id }).toArray();
  console.log('userquestprogresses:', progs.length);

  // Check questapplications (different name?)
  const apps2 = await db.collection('questapplications').find({ quest: quest._id }).toArray().catch(()=>[]);
  console.log('questapplications:', apps2.length);

  // Look at first few if any
  if (apps.length) console.log('Sample app:', JSON.stringify(apps[0], null, 2));
  if (progs.length) console.log('Sample prog:', JSON.stringify(progs[0], null, 2));

  await mongoose.disconnect();
});
