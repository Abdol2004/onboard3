/**
 * One-time script: Send acknowledgement + UITH event invite to all
 * Campus Ambassador applicants from Kwara State.
 *
 * Usage: node scripts/send-kwara-ambassador-emails.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CampusAmbassador = require('../models/CampusAmbassador');
const { Resend } = require('resend');

const WHATSAPP_LINK = 'https://chat.whatsapp.com/DkiPPkZ7ykgHqGuy4c0v3C?mode=gi_t';

// Already sent via Gmail before limit hit — skip these
const ALREADY_SENT = new Set([
  'ibnmarzuk207@gmail.com',
  'abdulrahmanabdulraheem63@gmail.com',
  'abdulsalam1in3@gmail.com',
  'umarmohammedyanman@gmail.com',
  'ololadeanisulowo@gmail.com',
  'savageeva72@gmail.com',
  'lordolayinka@gmail.com',
  'lateefariyibi4uall@gmail.com',
  'abdullahiakanbi27@gmail.com',
  'thompsonisaac334@gmail.com',
  'mhorlahethey@gmail.com',
]);

async function sendViaResend(mail) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.FROM_EMAIL || 'hello@onboard3.app';
  const { data, error } = await resend.emails.send({
    from: `ONBOARD3 <${fromEmail}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
  });
  if (error) return { success: false, error: error.message || JSON.stringify(error) };
  return { success: true, data };
}

function buildEmail(applicant) {
  const { fullName, institutionName } = applicant;
  const firstName = fullName.split(' ')[0];

  return {
    to: applicant.email,
    subject: 'Your ONBOARD3 Campus Ambassador Application — Update',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">

    <!-- Header -->
    <div style="background:#0a0a0a;padding:28px 32px;text-align:center;">
      <h1 style="color:#39FF14;margin:0;font-size:1.6rem;letter-spacing:0.05em;">ONBOARD3</h1>
      <p style="color:#888;margin:6px 0 0;font-size:0.85rem;">Campus Ambassador Program</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#111;font-size:1rem;margin-bottom:1rem;">Hi <strong>${firstName}</strong>,</p>

      <p style="color:#333;font-size:0.95rem;line-height:1.7;margin-bottom:1rem;">
        Thank you for applying to the <strong>ONBOARD3 Campus Ambassador Program</strong>!
        We have received your application from <strong>${institutionName}</strong> and our team
        is currently reviewing it.
      </p>

      <p style="color:#333;font-size:0.95rem;line-height:1.7;margin-bottom:1.5rem;">
        We will reach out to you directly when we are ready to host an event at
        <strong>${institutionName}</strong> — so keep an eye on your inbox.
      </p>

      <!-- Event Invite Box -->
      <div style="background:#f9fff5;border:2px solid #39FF14;border-radius:10px;padding:20px 24px;margin-bottom:1.5rem;">
        <p style="color:#111;font-weight:700;font-size:1rem;margin:0 0 10px;">
          📍 Meanwhile — Join Us This Saturday!
        </p>
        <p style="color:#333;font-size:0.9rem;line-height:1.6;margin:0 0 12px;">
          We are hosting the <strong>University of Ilorin Teaching Hospital (UITH) 1st Web3 Meetup</strong>
          right here in Kwara State. As an applicant from Kwara, we would love to have you there in person!
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <tr>
            <td style="padding:5px 0;color:#888;font-size:0.85rem;width:80px;">📅 Date</td>
            <td style="padding:5px 0;color:#111;font-size:0.9rem;font-weight:600;">Saturday, 7th March 2026</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#888;font-size:0.85rem;">⏰ Time</td>
            <td style="padding:5px 0;color:#111;font-size:0.9rem;font-weight:600;">9:00 AM</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#888;font-size:0.85rem;">📌 Venue</td>
            <td style="padding:5px 0;color:#111;font-size:0.9rem;font-weight:600;">UITH School Complex, Amilengbe, Ilorin, Kwara State</td>
          </tr>
        </table>
        <a href="${WHATSAPP_LINK}"
           style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:0.9rem;">
          💬 Join the WhatsApp Group
        </a>
      </div>

      <p style="color:#555;font-size:0.9rem;line-height:1.6;">
        This is a great opportunity to network with other Web3 builders, meet the ONBOARD3 team,
        and get a head-start on your ambassador journey. We hope to see you there!
      </p>

      <p style="color:#333;font-size:0.95rem;margin-top:1.5rem;">
        Keep building,<br>
        <strong>The ONBOARD3 Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9f9f9;border-top:1px solid #eee;padding:16px 32px;text-align:center;">
      <p style="color:#aaa;font-size:0.78rem;margin:0;">
        © 2026 ONBOARD3 · You are receiving this because you applied to our Campus Ambassador Program.
      </p>
    </div>

  </div>
</body>
</html>`
  };
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected.\n');

  // Find all applicants from Kwara State (case-insensitive)
  const applicants = await CampusAmbassador.find({
    state: { $regex: /kwara/i }
  });

  if (applicants.length === 0) {
    console.log('No Kwara State applicants found.');
    // Print all distinct states for reference
    const states = await CampusAmbassador.distinct('state');
    console.log('States found in DB:', states);
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${applicants.length} Kwara State applicant(s):\n`);
  applicants.forEach(a => console.log(`  - ${a.fullName} | ${a.institutionName} | ${a.email} | ${a.status}`));
  console.log('');

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const applicant of applicants) {
    // Skip if already sent via Gmail (hardcoded) OR already marked in DB
    if (ALREADY_SENT.has(applicant.email) || applicant.kwaraEmailSentAt) {
      console.log(`⏭️  Skipping ${applicant.email} (already sent)`);
      skipped++;
      continue;
    }
    try {
      const mail = buildEmail(applicant);
      const result = await sendViaResend(mail);
      if (result && result.success) {
        // Mark in DB so re-runs skip this record
        await CampusAmbassador.collection.updateOne(
          { _id: applicant._id },
          { $set: { kwaraEmailSentAt: new Date() } }
        );
        console.log(`✅ Sent + marked in DB: ${applicant.email} (${applicant.fullName} — ${applicant.institutionName})`);
        sent++;
      } else {
        console.error(`❌ Failed for ${applicant.email}:`, result && result.error);
        failed++;
      }
    } catch (err) {
      console.error(`❌ Error for ${applicant.email}:`, err.message);
      failed++;
    }
    // Small delay to avoid Resend rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nSummary: ${sent} sent, ${skipped} skipped, ${failed} failed out of ${applicants.length} Kwara applicants.`);
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
