require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const result = await User.updateMany(
    { pathwayStatus: 'pending' },
    { $set: { pathwayStatus: 'rejected', 'pathwayApplication.reviewedAt': new Date(), 'pathwayApplication.reviewNote': 'Pathway re-selection required.' } }
  );
  console.log(`Rejected ${result.modifiedCount} pending pathway applications`);
  await mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
