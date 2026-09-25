/**
 * Sync ZAD bounty winners to ONBOARD3 users.
 * - Fetches all past ZAD bounties
 * - Matches winners to ONBOARD3 users by Stacks address or submission summary tag
 * - Creates/updates ThirdPartySubmission with status='winner'
 * - Sends a notification the first time a win is recorded
 *
 * Run: node scripts/sync-zad-winners.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios    = require('axios');

const MONGO_URI = process.env.MONGO_URI;
const ZAD_API   = 'https://zeroauthoritydao.com/api';
const ZAD_KEY   = process.env.ZAD_API_KEY || 'za_6b32ad87454525c5dff45303fea490ca6774c1b8f7c2fe4cea48f6c4d6818b1f';
const HEADERS   = () => ({ Authorization: `Bearer ${ZAD_KEY}`, 'Content-Type': 'application/json' });

if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

function rankLabel(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

async function fetchAllZADBounties() {
  const results = [];
  // Fetch up to 5 pages of expired/past bounties
  for (let page = 1; page <= 5; page++) {
    try {
      const r = await axios.get(`${ZAD_API}/bounties`, {
        params: { limit: 20, page, includeExpired: true },
        headers: HEADERS(), timeout: 10000
      });
      const items = r.data?.data || [];
      if (!items.length) break;
      results.push(...items);
    } catch (e) {
      console.error(`Page ${page} fetch failed:`, e.message);
      break;
    }
  }
  // Also fetch open bounties in case some have winners
  for (let page = 1; page <= 3; page++) {
    try {
      const r = await axios.get(`${ZAD_API}/bounties`, {
        params: { status: 'Open', limit: 20, page },
        headers: HEADERS(), timeout: 10000
      });
      const items = r.data?.data || [];
      if (!items.length) break;
      results.push(...items);
    } catch {}
  }
  // Deduplicate by id
  const seen = new Set();
  return results.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
}

async function fetchBountyDetail(id) {
  try {
    const r = await axios.get(`${ZAD_API}/bounties/${id}`, { headers: HEADERS(), timeout: 10000 });
    return r.data;
  } catch (e) {
    console.error(`Detail fetch failed for ${id}:`, e.message);
    return null;
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const User                 = require('../models/User');
  const ThirdPartySubmission = require('../models/ThirdPartySubmission');
  const { notify }           = require('../utils/notificationService');

  const allBounties = await fetchAllZADBounties();
  console.log(`Fetched ${allBounties.length} ZAD bounties total`);

  // Filter to only those that have winners
  const withWinners = allBounties.filter(b => b.winners?.length || b.status === 'Completed');
  console.log(`${withWinners.length} bounties have winners or are completed\n`);

  let totalNotified = 0;
  let totalUpdated  = 0;

  for (const summary of withWinners) {
    // Get full detail to get winners array with addresses
    const bounty = await fetchBountyDetail(summary.id);
    if (!bounty) continue;

    const rawWinners = bounty.winners || [];
    if (!rawWinners.length) continue;

    console.log(`[${bounty.name}] ${rawWinners.length} winner(s)`);

    // Collect all winner addresses for bulk user lookup
    const addresses = rawWinners
      .map(w => w.address || w.submitter?.walletAddress || w.submitterAddress || w.walletAddress)
      .filter(Boolean);

    const matchedUsers = addresses.length
      ? await User.find({ stacksAddress: { $in: addresses } }).select('_id username stacksAddress').lean()
      : [];

    for (let ri = 0; ri < rawWinners.length; ri++) {
      const w    = rawWinners[ri];
      const rank = ri + 1;
      const addr = w.address || w.submitter?.walletAddress || w.submitterAddress || w.walletAddress;

      // Try match by address
      let onboardUser = addr ? matchedUsers.find(u => u.stacksAddress === addr) : null;

      // Try match by summary tag "@username (via ONBOARD3)"
      if (!onboardUser) {
        const sumText = w.summary || w.submission?.summary || '';
        const m = sumText.match(/Submitted by:\s*@([\w.]+)\s*\(via ONBOARD3\)/i)
                || sumText.match(/\[([^\]]+) via ONBOARD3\]/i);
        if (m) {
          onboardUser = await User.findOne({ username: new RegExp(`^${m[1]}$`, 'i') })
            .select('_id username stacksAddress').lean();
        }
      }

      if (!onboardUser) {
        console.log(`  rank ${rank}: no ONBOARD3 match (addr: ${addr || 'none'})`);
        continue;
      }

      console.log(`  rank ${rank}: matched @${onboardUser.username}`);

      // Find or create ThirdPartySubmission
      let sub = await ThirdPartySubmission.findOne({
        externalBountyId: String(bounty.id),
        userId: onboardUser._id
      });

      if (!sub) {
        // Winner submitted directly on ZAD (no ONBOARD3 submission record) — create one
        sub = new ThirdPartySubmission({
          platform:         'zeroauthoritydao',
          externalBountyId: String(bounty.id),
          bountyName:       bounty.name || String(bounty.id),
          userId:           onboardUser._id,
          summary:          w.summary || w.submission?.summary || `Won ${rankLabel(rank)} place`,
          submissionUrl:    w.submissionUrl || w.submission?.submissionUrl || null,
          status:           'winner',
        });
        await sub.save();
        console.log(`    Created ThirdPartySubmission (winner)`);
        totalUpdated++;
      } else if (sub.status !== 'winner') {
        sub.status     = 'winner';
        sub.bountyName = sub.bountyName || bounty.name || String(bounty.id);
        await sub.save();
        console.log(`    Updated ThirdPartySubmission → winner`);
        totalUpdated++;
      } else {
        console.log(`    Already marked as winner — skipping notification`);
        continue; // already synced, don't re-notify
      }

      // Send notification
      try {
        await notify(onboardUser._id, {
          type:    'reward',
          title:   'You won a bounty!',
          message: `You placed ${rankLabel(rank)} in "${bounty.name || 'a ZAD bounty'}" on ZeroAuthorityDAO!`,
          link:    `/dashboard/bounties/external/${bounty.id}`
        });
        console.log(`    Notification sent to @${onboardUser.username}`);
        totalNotified++;
      } catch (e) {
        console.error(`    Notification failed:`, e.message);
      }
    }
  }

  console.log(`\nDone. Updated: ${totalUpdated}, Notified: ${totalNotified}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
