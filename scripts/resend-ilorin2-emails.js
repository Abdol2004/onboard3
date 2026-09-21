/**
 * Re-send approval emails to all approved registrants for Onboard3 Connect Ilorin #2
 * Uses Resend directly (bypasses Gmail/dev-mode redirect) and sends to real addresses.
 */
process.env.NODE_ENV = 'production'; // must be before any require that reads this

const mongoose = require('mongoose');
require('dotenv').config();
const { Resend } = require('resend');

const EVENT_ID = '6a8f82285fef29338fb847f7';
const uri      = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URI;

(async () => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  const Event        = require('../models/Event');
  const emailService = require('../utils/emailService');

  const event    = await Event.findById(EVENT_ID).lean();
  const approved = event.registrations.filter(r => r.status === 'approved');
  console.log(`Sending approval emails to ${approved.length} approved registrants...\n`);

  // Build the same HTML the approval email uses (call sendEventApprovalEmail which now
  // will use Resend because we set NODE_ENV=production and the provider default is resend)
  let sent = 0, failed = 0;

  for (const reg of approved) {
    const result = await emailService.sendEventApprovalEmail(reg.email, reg.username, event);
    if (result && result.success !== false) {
      sent++;
      console.log(`✅ ${reg.username} → ${reg.email}`);
    } else {
      failed++;
      console.log(`❌ ${reg.username} → ${reg.email} | ${result?.error || 'unknown'}`);
    }
    // Small delay to stay within Resend rate limits
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\nDone. ${sent} sent, ${failed} failed.`);
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
