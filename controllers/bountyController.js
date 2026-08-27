const axios  = require('axios');
const Bounty               = require('../models/Bounty');
const BountySubmission     = require('../models/BountySubmission');
const ThirdPartySubmission = require('../models/ThirdPartySubmission');
const User                 = require('../models/User');

const ZAD_API     = 'https://zeroauthoritydao.com/api';
const ZAD_KEY     = process.env.ZAD_API_KEY || 'za_6b32ad87454525c5dff45303fea490ca6774c1b8f7c2fe4cea48f6c4d6818b1f';
const ZAD_HEADERS = () => ({ Authorization: `Bearer ${ZAD_KEY}`, 'Content-Type': 'application/json' });

// ── Token price cache (10 min TTL) ───────────────────────────────────────────
let _priceCache   = {};
let _priceCacheAt = 0;
// Maps token symbol → CoinGecko ID (known tokens only)
const GECKO_IDS = { STX: 'blockstack', BTC: 'bitcoin', sBTC: 'bitcoin', ETH: 'ethereum' };
// Stablecoins always $1
const STABLES   = new Set(['USDC','USDT','DAI','BUSD','TUSD']);

async function getTokenPrices(symbols) {
  const now = Date.now();
  if (now - _priceCacheAt < 10 * 60 * 1000 && Object.keys(_priceCache).length) return _priceCache;
  const ids = [...new Set(symbols.map(s => GECKO_IDS[s]).filter(Boolean))];
  if (!ids.length) return _priceCache;
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: ids.join(','), vs_currencies: 'usd' }, timeout: 6000
    });
    const prices = {};
    for (const [sym, id] of Object.entries(GECKO_IDS)) {
      if (res.data[id]) prices[sym] = res.data[id].usd;
    }
    _priceCache   = prices;
    _priceCacheAt = now;
    return prices;
  } catch {
    return _priceCache;
  }
}

// Convert totalPayment to USD string, returns null if not possible
function toUSD(amount, symbol, prices) {
  if (!amount || !symbol) return null;
  if (STABLES.has(symbol)) return '$' + Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const price = prices[symbol];
  if (!price) return null;
  const usd = amount * price;
  if (usd >= 1000) return '$' + Math.round(usd).toLocaleString('en-US');
  return '$' + usd.toFixed(2);
}

// ── ZAD cache (5 min TTL) ─────────────────────────────────────────────────────
let _zadLiveCache   = null; let _zadLiveCacheAt = 0;
let _zadPastCache   = null; let _zadPastCacheAt = 0;

async function getZADBounties() {
  const now = Date.now();
  const liveStale = !_zadLiveCache || now - _zadLiveCacheAt > 5 * 60 * 1000;
  const pastStale = !_zadPastCache || now - _zadPastCacheAt > 5 * 60 * 1000;

  try {
    if (liveStale) {
      // Fetch open (live) bounties — paginate up to 60
      const [p1, p2, p3] = await Promise.allSettled([
        axios.get(`${ZAD_API}/bounties`, { params: { status: 'Open', limit: 20, page: 1 }, headers: ZAD_HEADERS(), timeout: 10000 }),
        axios.get(`${ZAD_API}/bounties`, { params: { status: 'Open', limit: 20, page: 2 }, headers: ZAD_HEADERS(), timeout: 10000 }),
        axios.get(`${ZAD_API}/bounties`, { params: { status: 'Open', limit: 20, page: 3 }, headers: ZAD_HEADERS(), timeout: 10000 })
      ]);
      _zadLiveCache = [
        ...(p1.status === 'fulfilled' ? p1.value.data?.data || [] : []),
        ...(p2.status === 'fulfilled' ? p2.value.data?.data || [] : []),
        ...(p3.status === 'fulfilled' ? p3.value.data?.data || [] : [])
      ];
      _zadLiveCacheAt = now;
    }
    if (pastStale) {
      // Fetch closed/expired bounties
      const [p1, p2] = await Promise.allSettled([
        axios.get(`${ZAD_API}/bounties`, { params: { limit: 20, page: 1, includeExpired: true }, headers: ZAD_HEADERS(), timeout: 10000 }),
        axios.get(`${ZAD_API}/bounties`, { params: { limit: 20, page: 2, includeExpired: true }, headers: ZAD_HEADERS(), timeout: 10000 })
      ]);
      const all = [
        ...(p1.status === 'fulfilled' ? p1.value.data?.data || [] : []),
        ...(p2.status === 'fulfilled' ? p2.value.data?.data || [] : [])
      ];
      _zadPastCache = all.filter(b => b.isExpired || b.status !== 'Open');
      _zadPastCacheAt = now;
    }
  } catch (err) {
    console.error('[ZAD] Error fetching bounties:', err.message);
  }

  return { live: _zadLiveCache || [], past: _zadPastCache || [] };
}

async function getZADBounty(id) {
  try {
    const res = await axios.get(`${ZAD_API}/bounties/${id}`, { headers: ZAD_HEADERS(), timeout: 10000 });
    return res.data;
  } catch (err) {
    console.error('[ZAD] Error fetching bounty:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /dashboard/bounties
exports.listBounties = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password').lean();

    // Internal: live = active + not ended; ended = active but endDate past OR inactive
    const allInternal    = await Bounty.find().sort({ createdAt: -1 }).lean();
    const internalLive   = allInternal.filter(b => b.isActive && (!b.endDate || new Date() < new Date(b.endDate)) && b.status !== 'winners_announced');
    const internalEnded  = allInternal.filter(b => !b.isActive || (b.endDate && new Date() > new Date(b.endDate)) || b.status === 'winners_announced');

    // ZAD partner bounties
    const { live: zadRawLive, past: zadRawPast } = await getZADBounties();

    // Re-classify: a "live" bounty is only truly active if not expired AND deadline hasn't passed
    const now = Date.now();
    const isZADEnded = (b) => {
      if (b.isExpired || b.status !== 'Open') return true;
      const ts = b.deadline || b.endDate ? new Date(b.deadline || b.endDate).getTime() : NaN;
      return !isNaN(ts) && ts < now;
    };
    const zadLive = zadRawLive.filter(b => !isZADEnded(b));
    const zadPast = [...zadRawPast, ...zadRawLive.filter(isZADEnded)];

    // Fetch token prices for all symbols seen in ZAD bounties
    const symbols  = [...new Set([...zadLive, ...zadPast].map(b => b.token?.symbol).filter(Boolean))];
    const prices   = await getTokenPrices(symbols);

    // Attach usdValue to each ZAD bounty
    const enrichZAD = (b) => ({
      ...b,
      usdValue: toUSD(b.totalPayment, b.token?.symbol, prices)
    });

    res.render('dashboard/bounty', {
      title: 'Bounties — ONBOARD3', user, currentPage: 'bounties',
      internalLive, internalEnded,
      zadLive: zadLive.map(enrichZAD),
      zadPast: zadPast.map(enrichZAD)
    });
  } catch (err) {
    console.error('[Bounty] listBounties:', err);
    res.status(500).send('Error loading bounties');
  }
};

// GET /dashboard/bounties/internal/:id
exports.internalBountyDetail = async (req, res) => {
  try {
    const user   = await User.findById(req.session.userId).select('-password').lean();
    const bounty = await Bounty.findById(req.params.id).populate('createdBy', 'username').lean();
    if (!bounty || !bounty.isActive) return res.status(404).send('Bounty not found');

    const submissions = await BountySubmission.find({ bountyId: bounty._id })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 }).lean();

    const mySubmission = submissions.find(s => s.userId?._id?.toString() === req.session.userId) || null;

    res.render('dashboard/bounty-details', {
      title: bounty.title + ' — ONBOARD3', user, currentPage: 'bounties',
      bounty, submissions, mySubmission
    });
  } catch (err) {
    console.error('[Bounty] internalBountyDetail:', err);
    res.status(500).send('Error loading bounty');
  }
};

// POST /dashboard/bounties/internal/:id/submit
exports.submitToInternalBounty = async (req, res) => {
  try {
    const { title, description, submissionUrl } = req.body;
    const bountyId = req.params.id;

    if (!title?.trim() || !description?.trim() || !submissionUrl?.trim()) {
      return res.status(400).json({ success: false, message: 'Title, description, and work URL are required' });
    }

    const bounty = await Bounty.findById(bountyId);
    if (!bounty || !bounty.isActive) {
      return res.status(404).json({ success: false, message: 'Bounty not found' });
    }
    if (bounty.hasEnded()) {
      return res.status(400).json({ success: false, message: 'This bounty has ended. No more submissions.' });
    }

    const existing = await BountySubmission.findOne({ bountyId, userId: req.session.userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already submitted to this bounty.' });
    }

    await BountySubmission.create({
      bountyId, userId: req.session.userId,
      title: title.trim(), description: description.trim(),
      submissionUrl: submissionUrl?.trim() || null
    });
    await Bounty.findByIdAndUpdate(bountyId, { $inc: { totalSubmissions: 1 } });

    return res.json({ success: true, message: 'Submission received!' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'You have already submitted to this bounty.' });
    console.error('[Bounty] submitInternal:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// GET /dashboard/bounties/external/:id
exports.externalBountyDetail = async (req, res) => {
  try {
    const user      = await User.findById(req.session.userId).select('-password').lean();
    const bountyId  = req.params.id;
    const zadBounty = await getZADBounty(bountyId);
    if (!zadBounty) return res.redirect('/dashboard/bounties?error=bounty_not_found');

    const mySubmission = await ThirdPartySubmission.findOne({
      externalBountyId: bountyId, userId: req.session.userId
    }).lean();

    const ourSubmissions = await ThirdPartySubmission.find({ externalBountyId: bountyId })
      .populate('userId', 'username profilePicture stacksAddress')
      .sort({ createdAt: -1 }).lean();

    const prices   = await getTokenPrices([zadBounty.token?.symbol].filter(Boolean));
    const usdValue = toUSD(zadBounty.totalPayment, zadBounty.token?.symbol, prices);

    res.render('dashboard/bounty-external', {
      title: (zadBounty.name || 'Bounty') + ' — ONBOARD3', user, currentPage: 'bounties',
      bounty: { ...zadBounty, usdValue }, mySubmission: mySubmission || null, ourSubmissions,
      userStacksAddress: user?.stacksAddress || null,
      zadBountyUrl: `https://zeroauthoritydao.com/bounty/${bountyId}`
    });
  } catch (err) {
    console.error('[Bounty] externalBountyDetail:', err);
    res.status(500).send('Error loading bounty');
  }
};

// POST /dashboard/bounties/external/:id/submit
exports.submitToExternalBounty = async (req, res) => {
  try {
    const { summary, submissionUrl } = req.body;
    const bountyId = req.params.id;

    if (!summary?.trim() || !submissionUrl?.trim()) return res.status(400).json({ success: false, message: 'Summary and work URL are required' });

    const existing = await ThirdPartySubmission.findOne({ externalBountyId: bountyId, userId: req.session.userId });
    if (existing) return res.status(400).json({ success: false, message: 'You have already submitted to this bounty.' });

    const zadBounty = await getZADBounty(bountyId);
    if (!zadBounty) return res.status(404).json({ success: false, message: 'Bounty not found on external platform' });
    if (zadBounty.isExpired || zadBounty.status !== 'Open') {
      return res.status(400).json({ success: false, message: 'This bounty is no longer accepting submissions.' });
    }

    const sw = require('../utils/stacksWallet');

    // Ensure user has a custodial Stacks wallet
    const wallet = await sw.assignWallet(req.session.userId);

    // Prefix summary with ONBOARD3 username so it appears on ZAD's platform
    const submitter = await User.findById(req.session.userId).select('username').lean();
    const taggedSummary = submitter?.username
      ? `[${submitter.username} via ONBOARD3] ${summary.trim()}`
      : summary.trim();

    // Submit on-chain to ZeroAuthDAO from the user's custodial wallet
    let txId = null;
    let onChainError = null;
    try {
      const onChain = await sw.submitBountyOnChain(req.session.userId, bountyId, taggedSummary, submissionUrl?.trim() || null);
      txId = onChain.txId;
    } catch (err) {
      onChainError = err.message;
      console.error('[Bounty] on-chain submit failed:', err.message);
    }

    await ThirdPartySubmission.create({
      platform: 'zeroauthoritydao', externalBountyId: bountyId,
      bountyName: zadBounty.name || '', userId: req.session.userId,
      summary: summary.trim(), submissionUrl: submissionUrl?.trim() || null,
      zadSubmissionId: txId, status: txId ? 'submitted' : 'pending'
    });

    _zadLiveCache = null; _zadLiveCacheAt = 0;

    if (txId) {
      return res.json({
        success: true,
        message: 'Submission sent to ZeroAuthDAO on-chain! Your entry is live.',
        txId,
        stacksAddress: wallet.address
      });
    } else {
      return res.json({
        success: true,
        message: 'Submission saved. On-chain relay will retry shortly.' + (onChainError ? ' (' + onChainError + ')' : ''),
        stacksAddress: wallet.address
      });
    }
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'You have already submitted to this bounty.' });
    console.error('[Bounty] submitExternal:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

exports.adminListBounties = async (req, res) => {
  try {
    const user     = await User.findById(req.session.userId).select('-password').lean();
    const bounties = await Bounty.find().sort({ createdAt: -1 }).lean();
    res.render('admin/pages/bounties', { user, page: 'bounties', bounties });
  } catch (err) {
    console.error('[Admin Bounty] list:', err);
    res.status(500).send('Error');
  }
};

exports.adminCreateBounty = async (req, res) => {
  try {
    const { title, shortDescription, description, image, category, rewardPool, rewardToken, startDate, endDate, maxSubmissionsPerUser } = req.body;

    const ranks       = [].concat(req.body['split_rank']       || []);
    const labels      = [].concat(req.body['split_label']      || []);
    const percentages = [].concat(req.body['split_percentage'] || []);

    const rewardSplit = ranks.map((r, i) => ({
      rank: parseInt(r) || i + 1, label: labels[i] || `#${i+1}`,
      percentage: parseFloat(percentages[i]) || 0
    })).filter(s => s.percentage > 0);

    const bounty = await Bounty.create({
      title, shortDescription, description, image: image || null,
      category: category || 'other',
      rewardPool: parseFloat(rewardPool) || 0, rewardToken: rewardToken || 'USDC',
      rewardSplit, startDate: startDate || null, endDate: endDate || null,
      maxSubmissionsPerUser: parseInt(maxSubmissionsPerUser) || 1,
      isActive: false, status: 'draft', createdBy: req.session.userId
    });

    res.redirect(`/admin/bounties/${bounty._id}?created=1`);
  } catch (err) {
    console.error('[Admin Bounty] create:', err);
    res.status(500).send('Error: ' + err.message);
  }
};

exports.adminBountyDetail = async (req, res) => {
  try {
    const user   = await User.findById(req.session.userId).select('-password').lean();
    const bounty = await Bounty.findById(req.params.id).lean();
    if (!bounty) return res.status(404).send('Bounty not found');

    const submissions = await BountySubmission.find({ bountyId: bounty._id })
      .populate('userId', 'username profilePicture email')
      .sort({ createdAt: -1 }).lean();

    res.render('admin/pages/bounty-detail', {
      user, page: 'bounties', bounty, submissions, created: req.query.created === '1'
    });
  } catch (err) {
    console.error('[Admin Bounty] detail:', err);
    res.status(500).send('Error');
  }
};

exports.adminToggleBounty = async (req, res) => {
  try {
    const bounty  = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).send('Not found');
    bounty.isActive = !bounty.isActive;
    bounty.status   = bounty.isActive ? 'active' : 'ended';
    await bounty.save();
    res.redirect(`/admin/bounties/${bounty._id}`);
  } catch (err) {
    console.error('[Admin Bounty] toggle:', err);
    res.status(500).send('Error');
  }
};

exports.adminAnnounceWinners = async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Not found' });

    const subIds = [].concat(req.body.winner_submission || []);
    const winners = [];

    for (let i = 0; i < subIds.length; i++) {
      const sub = await BountySubmission.findById(subIds[i]);
      if (!sub) continue;
      const rank   = i + 1;
      const split  = bounty.rewardSplit.find(s => s.rank === rank);
      const amount = split?.amount || 0;
      sub.status = 'winner'; sub.rank = rank; sub.amountWon = amount;
      await sub.save();
      winners.push({ userId: sub.userId, submissionId: sub._id, rank, amountWon: amount });
    }

    bounty.winners = winners;
    bounty.status  = 'winners_announced';
    await bounty.save();

    return res.json({ success: true, message: 'Winners announced!' });
  } catch (err) {
    console.error('[Admin Bounty] announceWinners:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.adminDeleteBounty = async (req, res) => {
  try {
    await BountySubmission.deleteMany({ bountyId: req.params.id });
    await Bounty.findByIdAndDelete(req.params.id);
    res.redirect('/admin/bounties');
  } catch (err) {
    console.error('[Admin Bounty] delete:', err);
    res.status(500).send('Error');
  }
};
