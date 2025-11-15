const mongoose = require('mongoose');
const Quest = require('./models/Quest');

const MONGODB_URI = 'mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function fixTaskTypes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the quest by title
    const quest = await Quest.findOne({ 
      title: "🎯 Web3 Fundamentals - Your Complete Onboarding Journey" 
    });

    if (!quest) {
      console.log('❌ Quest not found!');
      return;
    }

    console.log('\n📋 Current Quest:', quest.title);
    console.log('Total Tasks:', quest.tasks.length);
    
    console.log('\n🔍 Checking task types:');
    quest.tasks.forEach((task, index) => {
      console.log(`Task ${index + 1}: ${task.title}`);
      console.log(`  Current Type: ${task.taskType}`);
      console.log(`  Has inputLabel: ${!!task.inputLabel}`);
      console.log(`  Has inputName: ${!!task.inputName}`);
      console.log(`  Has requirements: ${!!task.requirements}`);
      console.log('');
    });

    // Update all tasks to quiz type with proper fields
    quest.tasks = quest.tasks.map((task, index) => {
      // Ensure all required fields are present
      return {
        ...task.toObject(),
        taskType: 'quiz',
        // Make sure these fields exist
        inputLabel: task.inputLabel || `Complete Task ${index + 1}`,
        inputName: task.inputName || `task_${index + 1}`,
        requirements: task.requirements || { action: 'completed' }
      };
    });

    await quest.save();

    console.log('\n✅ SUCCESS! All tasks updated to quiz type');
    console.log('\n📋 Updated Task Types:');
    quest.tasks.forEach((task, index) => {
      console.log(`Task ${index + 1}: ${task.title}`);
      console.log(`  Type: ${task.taskType}`);
      console.log(`  Input Label: ${task.inputLabel}`);
      console.log(`  Input Name: ${task.inputName}`);
      console.log(`  Requirements: ${JSON.stringify(task.requirements)}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixTaskTypes();