/**
 * Bulk-approve all pending registrations for Onboard3 Connect Ilorin #2
 * Updates venue + WhatsApp group, then approves + emails everyone.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const EVENT_ID     = '6a8f82285fef29338fb847f7';
const VENUE        = 'IB Academy Tanke, opposite Juniwad Filling Station, MTN Office';
const WHATSAPP_URL = 'https://chat.whatsapp.com/CTfkBYy3glz1lb281y8pMb?mode=gi_t';

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URI;

(async () => {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  const Event        = require('../models/Event');
  const emailService = require('../utils/emailService');

  // 1. Update event with full venue + WhatsApp group
  await Event.findByIdAndUpdate(EVENT_ID, {
    venue:          VENUE,
    whatsappGroup:  WHATSAPP_URL,
    city:           'Ilorin',
    country:        'Nigeria',
  });
  console.log('Event venue + WhatsApp group updated.\n');

  // 2. Re-fetch with updated fields
  const event = await Event.findById(EVENT_ID).lean();
  const pending = event.registrations.filter(r => r.status === 'pending');
  console.log(`Found ${pending.length} pending registrations.\n`);

  let approved = 0, failed = 0;

  for (const reg of pending) {
    // Approve in DB
    await Event.updateOne(
      { _id: EVENT_ID, 'registrations._id': reg._id },
      {
        $set: {
          'registrations.$.status':     'approved',
          'registrations.$.approvedAt': new Date(),
        },
        $inc: { totalApproved: 1 }
      }
    );

    // Send approval email
    const emailResult = await emailService.sendEventApprovalEmail(
      reg.email,
      reg.username,
      event  // event now has venue + whatsappGroup set
    );

    if (emailResult && emailResult.success !== false) {
      approved++;
      console.log(`✅ ${reg.username} (${reg.email})`);
    } else {
      approved++;  // DB approved regardless; log email issue separately
      console.log(`✅ ${reg.username} (${reg.email}) — DB approved | email: ${emailResult?.error || 'unknown issue'}`);
      failed++;
    }
  }

  console.log(`\nDone. ${approved} approved. ${failed > 0 ? failed + ' email(s) had issues.' : 'All emails sent.'}`);
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
