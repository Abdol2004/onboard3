// Create: delete-test-accounts.js
// Delete accounts created in the last hour (your test accounts)

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteRecentAccounts() {
  try {
    await mongoose.connect('mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("✅ Connected to database\n");

    // Find accounts created in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const recentUsers = await User.find({
      createdAt: { $gte: twoHoursAgo }
    })
    .select('username email createdAt registrationIP')
    .sort({ createdAt: -1 });

    if (recentUsers.length === 0) {
      console.log("✅ No recent accounts found (last 2 hours)");
      await mongoose.connection.close();
      rl.close();
      return;
    }

    console.log(`⚠️  Found ${recentUsers.length} accounts created in the last 2 hours:\n`);
    console.log('='.repeat(100));
    
    recentUsers.forEach((user, i) => {
      const age = Math.floor((Date.now() - new Date(user.createdAt)) / 1000 / 60);
      console.log(`${i + 1}. ${user.username.padEnd(20)} | ${user.email.padEnd(35)} | ${age} min ago | IP: ${user.registrationIP || 'N/A'}`);
    });

    console.log('='.repeat(100));
    console.log(`\n⚠️  WARNING: This will DELETE ${recentUsers.length} accounts!\n`);

    rl.question('Type "DELETE" to confirm or press Enter to cancel: ', async (answer) => {
      if (answer.trim().toUpperCase() === 'DELETE') {
        console.log('\n🗑️  Deleting accounts...\n');
        
        const userIds = recentUsers.map(u => u._id);
        const result = await User.deleteMany({ _id: { $in: userIds } });
        
        console.log(`✅ Deleted ${result.deletedCount} accounts`);
        
        // Show remaining total
        const remaining = await User.countDocuments();
        console.log(`📊 Remaining users in database: ${remaining}`);
      } else {
        console.log('❌ Deletion cancelled');
      }
      
      await mongoose.connection.close();
      rl.close();
    });

  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
    rl.close();
    process.exit(1);
  }
}

deleteRecentAccounts();