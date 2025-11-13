const mongoose = require('mongoose');
const Quest = require('./models/Quest');
require('dotenv').config();
async function migrateQuests() {
  try {
    await mongoose.connect('mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0nod');
    
    console.log('🔄 Migrating old quests...');
    
    // Update all old quest types to 'standard'
    const result = await Quest.updateMany(
      { 
        questType: { $in: ['permanent', 'daily', 'weekly', 'monthly', 'special'] }
      },
      { 
        $set: { 
          questType: 'standard',
          // Add new fields with default values
          baseXpReward: 0,
          dailyTasks: [],
          referralConfig: {
            enabled: false,
            xpPerReferralJoin: 0,
            xpPerReferralComplete: 0
          },
          competitionConfig: {
            enabled: false,
            topWinnersCount: 10,
            winnerBonusXP: 0
          }
        }
      }
    );
    
    console.log(`✅ Migrated ${result.modifiedCount} quests`);
    
    // Migrate xpReward to baseXpReward
    const rewardMigration = await Quest.updateMany(
      { baseXpReward: { $exists: false } },
      [
        { 
          $set: { 
            baseXpReward: { $ifNull: ['$xpReward', 0] }
          }
        }
      ]
    );
    
    console.log(`✅ Migrated rewards for ${rewardMigration.modifiedCount} quests`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateQuests();