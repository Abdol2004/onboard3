// scripts/reset-all-pathways.js
// Resets pathway + pathwayStatus for ALL users so they must re-select
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
        {},
        {
            $set: {
                pathway: null,
                pathwayStatus: null,
                'pathwayApplication.reason':     '',
                'pathwayApplication.experience': '',
                'pathwayApplication.appliedAt':  null,
                'pathwayApplication.reviewedAt': null,
                'pathwayApplication.reviewNote': ''
            }
        }
    );

    console.log(`Reset pathway for ${result.modifiedCount} users.`);
    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
