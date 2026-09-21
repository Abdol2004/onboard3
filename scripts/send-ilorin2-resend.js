/**
 * Send approval emails for Onboard3 Connect Ilorin #2 using Resend.
 * Pass target: 'new' to only email newly approved (dulham + Kwilliamdoteth),
 *              'all' to email all 31 approved registrants.
 * Usage: node scripts/send-ilorin2-resend.js [new|all]
 */
process.env.NODE_ENV = 'production';

const mongoose = require('mongoose');
require('dotenv').config();
const { Resend } = require('resend');

const EVENT_ID   = '6a8f82285fef29338fb847f7';
const FROM_EMAIL = 'ONBOARD3 <hello@onboard3.app>';
const WA_LINK    = 'https://chat.whatsapp.com/CTfkBYy3glz1lb281y8pMb?mode=gi_t';
const VENUE      = 'IB Academy, Tanke — Opposite Juniwad Filling Station, MTN Office, Ilorin, Kwara State';
const EVENT_DATE = new Date('2026-08-29T14:00:00.000Z'); // 3:00 PM WAT

const TARGET = process.argv[2] || 'new';
const NEW_USERNAMES = ['dulham', 'Kwilliamdoteth'];

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URI;

function buildCountdownText() {
  const now  = new Date();
  const diff = EVENT_DATE - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h/24)} day${Math.floor(h/24)!==1?'s':''} to go`;
  if (h > 0)  return `${h} hour${h!==1?'s':''} ${m} min to go`;
  return `${m} minute${m!==1?'s':''} to go`;
}

function buildHtml(username) {
  const countdown = buildCountdownText();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're Approved — Onboard3 Connect Ilorin #2</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

      <!-- Header -->
      <tr>
        <td style="background:#0d0d1a;padding:32px 40px;text-align:center">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#8b5cf6;letter-spacing:2px;text-transform:uppercase">ONBOARD3</p>
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff">You're In! 🎉</h1>
          <p style="margin:8px 0 0;color:#a0a0b0;font-size:14px">Your spot is confirmed for Onboard3 Connect Ilorin #2</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px">

          <p style="margin:0 0 20px;font-size:16px;color:#1a1a2e">Hi <strong>${username}</strong>,</p>
          <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.7">
            Your registration has been <strong style="color:#16a34a">approved</strong>. We can't wait to see you today!
          </p>

          ${countdown ? `
          <!-- Countdown -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td style="background:#0d0d1a;border-radius:10px;padding:18px 24px;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8b5cf6;letter-spacing:2px;text-transform:uppercase">Time Remaining</p>
                <p style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px">${countdown}</p>
              </td>
            </tr>
          </table>` : ''}

          <!-- Event details box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
            <tr>
              <td style="background:#fafafa;padding:14px 20px;border-bottom:1px solid #e5e7eb">
                <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:1px;text-transform:uppercase">Event Details</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:14px 20px;border-bottom:1px solid #f3f4f6">
                      <span style="font-size:13px;font-weight:600;color:#6b7280;display:inline-block;width:60px">📅 Date</span>
                      <span style="font-size:14px;color:#111827;font-weight:600">Saturday, 29 August 2026</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 20px;border-bottom:1px solid #f3f4f6">
                      <span style="font-size:13px;font-weight:600;color:#6b7280;display:inline-block;width:60px">🕙 Time</span>
                      <span style="font-size:14px;color:#111827;font-weight:600">3:00 PM — 5:00 PM WAT</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 20px">
                      <span style="font-size:13px;font-weight:600;color:#6b7280;display:inline-block;width:60px">📍 Venue</span>
                      <span style="font-size:14px;color:#111827;font-weight:600">${VENUE}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- WhatsApp CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;text-align:center">
                <p style="margin:0 0 6px;font-size:14px;color:#15803d;font-weight:600">Join the event WhatsApp group for live updates</p>
                <p style="margin:0 0 16px;font-size:13px;color:#166534">Get directions, updates, and connect with other attendees</p>
                <a href="${WA_LINK}" style="display:inline-block;background:#25d366;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px">
                  💬 Join WhatsApp Group
                </a>
              </td>
            </tr>
          </table>

          <!-- What to expect -->
          <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1a1a2e">What to expect 👇</p>
          <ul style="margin:0 0 28px;padding-left:20px;color:#444;font-size:14px;line-height:2">
            <li>Networking with Web3 builders in Ilorin</li>
            <li>Talks, workshops, and community building</li>
            <li>Arrive early — doors open at 10:00 AM</li>
            <li>Landmark: Opposite Juniwad Filling Station, Tanke</li>
          </ul>

          <p style="margin:0;font-size:15px;color:#444;line-height:1.7">See you there! 🚀<br><strong>— The ONBOARD3 Team</strong></p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#6b7280">ONBOARD3 · Web3 Builder Hub</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">Building the future, one builder at a time · Nigeria</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

(async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set in .env');
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  const Event = require('../models/Event');
  const event = await Event.findById(EVENT_ID).lean();

  let recipients = event.registrations.filter(r => r.status === 'approved');
  if (TARGET === 'new') {
    recipients = recipients.filter(r => NEW_USERNAMES.includes(r.username));
    console.log(`Sending to ${recipients.length} newly approved registrant(s)...\n`);
  } else {
    console.log(`Sending to all ${recipients.length} approved registrants...\n`);
  }

  let sent = 0, failed = 0;
  for (const reg of recipients) {
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      reg.email,
      subject: `✅ You're approved — Onboard3 Connect Ilorin #2 is TODAY`,
      html:    buildHtml(reg.username),
    });
    if (error) {
      failed++;
      console.log(`❌ ${reg.username} → ${reg.email} | ${error.message || JSON.stringify(error)}`);
    } else {
      sent++;
      console.log(`✅ ${reg.username} → ${reg.email}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone. ${sent} sent, ${failed} failed.`);
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
