// makeAdmin.js (Place this in your project ROOT directory)
// Run this script with: node makeAdmin.js <email or username>

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function makeUserAdmin() {
  try {
    // Get email or username from command line
    const identifier = process.argv[2];

    if (!identifier) {
      console.log("\n❌ Please provide an email or username");
      console.log("Usage: node makeAdmin.js <email or username>\n");
      console.log("Example: node makeAdmin.js admin@onboard3.com");
      console.log("Example: node makeAdmin.js adminuser\n");
      process.exit(1);
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      console.log(`\n❌ User not found: ${identifier}\n`);
      process.exit(1);
    }

    // Check if already admin
    if (user.isAdmin) {
      console.log(`\n✅ ${user.username} is already an admin!\n`);
      process.exit(0);
    }

    // Make admin
    user.isAdmin = true;
    user.role = 'admin';
    await user.save();

    console.log(`\n✅ SUCCESS! ${user.username} is now an admin!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   isAdmin: ${user.isAdmin}\n`);

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error making user admin:", error);
    process.exit(1);
  }
}

// List all users if no argument provided
async function listUsers() {
  try {
    const users = await User.find().select('username email isAdmin role');
    
    console.log("\n📋 All Users:");
    console.log("─────────────────────────────────────────────");
    
    if (users.length === 0) {
      console.log("No users found");
    } else {
      users.forEach((user, index) => {
        const adminBadge = user.isAdmin ? "👑 ADMIN" : "👤 USER";
        console.log(`${index + 1}. ${adminBadge} | ${user.username} | ${user.email}`);
      });
    }
    
    console.log("─────────────────────────────────────────────\n");
    process.exit(0);
  } catch (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }
}

// Run the appropriate function
if (process.argv[2] === '--list' || process.argv[2] === '-l') {
  listUsers();
} else {
  makeUserAdmin();
}