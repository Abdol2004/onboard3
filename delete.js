// Create: check-duplicates.js
// This shows all accounts grouped by IP

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkDuplicates() {
  try {
    await mongoose.connect('mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("✅ Connected to database\n");

    // Get all users with their IPs
    const users = await User.find()
      .select('username email registrationIP lastLoginIP createdAt isVerified')
      .sort({ createdAt: -1 });

    console.log(`📊 Total users: ${users.length}\n`);

    // Group by IP
    const ipGroups = {};
    
    users.forEach(user => {
      const ip = user.registrationIP || user.lastLoginIP || 'unknown';
      if (!ipGroups[ip]) {
        ipGroups[ip] = [];
      }
      ipGroups[ip].push(user);
    });

    // Show IPs with multiple accounts
    const suspiciousIPs = Object.entries(ipGroups)
      .filter(([ip, accounts]) => accounts.length > 1)
      .sort((a, b) => b[1].length - a[1].length);

    console.log(`⚠️  IPs with multiple accounts: ${suspiciousIPs.length}\n`);
    console.log('='.repeat(100));

    suspiciousIPs.forEach(([ip, accounts], index) => {
      console.log(`\n[${index + 1}] IP: ${ip} | ${accounts.length} accounts`);
      console.log('-'.repeat(100));
      
      accounts.forEach((user, i) => {
        const age = Math.floor((Date.now() - new Date(user.createdAt)) / 1000 / 60); // minutes
        console.log(`  ${i + 1}. ${user.username.padEnd(20)} | ${user.email.padEnd(30)} | ${age}m ago | Verified: ${user.isVerified ? '✅' : '❌'}`);
      });
    });

    console.log('\n' + '='.repeat(100));
    console.log('\n💡 To delete duplicate accounts, use: node delete-duplicates.js');

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDuplicates();