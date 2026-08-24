/**
 * One-time script: Send event reminders to all UITH event registrants
 * and set the WhatsApp group link on the event.
 *
 * Usage: node scripts/send-uith-reminders.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { sendEventReminderEmail } = require('../utils/emailService');

const UITH_WHATSAPP_LINK = 'https://chat.whatsapp.com/DkiPPkZ7ykgHqGuy4c0v3C?mode=gi_t';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected.');

  // Find events whose title contains UITH (case-insensitive)
  const events = await Event.find({ title: { $regex: /uith/i } });

  if (events.length === 0) {
    console.log('No UITH event found. Listing all events for reference:');
    const all = await Event.find({}, 'title startDate status');
    all.forEach(e => console.log(' -', e.title, '|', e.startDate, '|', e.status));
    await mongoose.disconnect();
    return;
  }

  for (const event of events) {
    console.log(`\nFound event: "${event.title}" (${event._id})`);
    console.log(`  Start: ${event.startDate} ${event.startTime}`);
    console.log(`  Registrations: ${event.registrations.length}`);

    // Always update WhatsApp group link to latest
    event.whatsappGroup = UITH_WHATSAPP_LINK;
    await event.save();
    console.log('  ✅ WhatsApp group link updated on event.');

    let sent = 0;
    let failed = 0;

    for (const reg of event.registrations) {
      if (!reg.email) {
        console.log(`  ⚠️  Skipping registration with no email (user: ${reg.username})`);
        failed++;
        continue;
      }

      try {
        const result = await sendEventReminderEmail(reg.email, reg.username || 'Builder', event);
        if (result && result.success) {
          console.log(`  ✅ Sent to ${reg.email} (${reg.username})`);
          sent++;
        } else {
          console.error(`  ❌ Failed for ${reg.email}:`, result && result.error);
          failed++;
        }
      } catch (err) {
        console.error(`  ❌ Error for ${reg.email}:`, err.message);
        failed++;
      }
    }

    console.log(`\n  Summary for "${event.title}": ${sent} sent, ${failed} failed`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
