const crypto = require('crypto');
const Bounty                   = require('../models/Bounty');
const BountyChallenge          = require('../models/BountyChallenge');
const SponsoredBountySubmission = require('../models/SponsoredBountySubmission');
const User                     = require('../models/User');

const CHALLENGE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getDomain(req) {
  return process.env.PLATFORM_DOMAIN || req.hostname || 'onboard3.xyz';
}

// ST... or SP... followed by 27-41 base58 chars
function isValidStacksAddress(addr) {
  return typeof addr === 'string' && /^S[PT][A-Z0-9]{27,41}$/.test(addr);
}

// ── POST /api/public/auth/challenge ────────────────────────────────────────────
async function createChallenge(req, res) {
  try {
    const { submitterAddress } = req.body;

    if (!submitterAddress) {
      return res.status(400).json({ success: false, error: 'submitterAddress is required' });
    }
    if (!isValidStacksAddress(submitterAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid Stacks address format' });
    }

    const nonce     = crypto.randomBytes(32).toString('hex');
    const domain    = getDomain(req);
    const now       = new Date();
    const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);

    const message = [
      `${domain} wants you to sign in with your Stacks account:`,
      submitterAddress,
      '',
      `URI: https://${domain}`,
      'Version: 1',
      `Nonce: ${nonce}`,
      `Issued At: ${now.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`
    ].join('\n');

    await BountyChallenge.create({
      nonce,
      message,
      submitterAddress,
      partnerKeyId: req.partnerKey._id,
      expiresAt
    });

    res.json({ success: true, data: { nonce, message, expiresAt } });
  } catch (err) {
    console.error('[createChallenge]', err);
    res.status(500).json({ success: false, error: 'Failed to create challenge' });
  }
}

// ── POST /api/public/bounties/:id/submissions ──────────────────────────────────
async function submitSponsoredEntry(req, res) {
  try {
    const { id }           = req.params;
    const idempotencyKey   = req.headers['idempotency-key'] || null;

    const {
      submitterAddress,
      originSignedTxHex,
      signedChallenge,
      challengeNonce,
      summary,
      submissionUrl,
      externalSubmissionId
    } = req.body;

    // ── Idempotency: return cached result if key already processed ────────────
    if (idempotencyKey) {
      const existing = await SponsoredBountySubmission.findOne({
        partnerKeyId: req.partnerKey._id,
        idempotencyKey
      });
      if (existing) {
        return res.json({
          success: true,
          data: {
            bountyId:         existing.bountyId,
            submissionId:     existing._id,
            txid:             existing.txid,
            submitterAddress: existing.submitterAddress
          }
        });
      }
    }

    // ── Required field validation ─────────────────────────────────────────────
    if (!submitterAddress || !originSignedTxHex || !signedChallenge || !challengeNonce) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: submitterAddress, originSignedTxHex, signedChallenge, challengeNonce'
      });
    }
    if (!summary && !submissionUrl) {
      return res.status(400).json({
        success: false,
        error: 'At least one of summary or submissionUrl is required'
      });
    }
    if (!isValidStacksAddress(submitterAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid Stacks address format' });
    }

    // ── Bounty validation ─────────────────────────────────────────────────────
    const bounty = await Bounty.findById(id).catch(() => null);
    if (!bounty) {
      return res.status(404).json({ success: false, error: 'Bounty not found' });
    }
    if (!bounty.isLive()) {
      return res.status(400).json({ success: false, error: 'Bounty is not currently open' });
    }
    if (bounty.rewardToken !== 'STX') {
      return res.status(400).json({ success: false, error: 'This bounty is not on the Stacks network' });
    }

    // ── Bounty scope check for this partner key ───────────────────────────────
    if (req.partnerKey.allowedBounties.length > 0) {
      const allowed = req.partnerKey.allowedBounties.map(b => b.toString());
      if (!allowed.includes(id)) {
        return res.status(403).json({ success: false, error: 'API key not authorized for this bounty' });
      }
    }

    // ── Challenge nonce validation ────────────────────────────────────────────
    const challenge = await BountyChallenge.findOne({ nonce: challengeNonce });
    if (!challenge) {
      return res.status(400).json({ success: false, error: 'Invalid challenge nonce' });
    }
    if (challenge.isUsed) {
      return res.status(400).json({
        success: false,
        error: 'Nonce already used — restart from challenge creation'
      });
    }
    if (new Date() > challenge.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Challenge expired — request a fresh challenge and re-sign'
      });
    }
    if (challenge.submitterAddress !== submitterAddress) {
      return res.status(400).json({
        success: false,
        error: 'submitterAddress does not match the signed challenge'
      });
    }

    // ── Consume nonce immediately to prevent replay ───────────────────────────
    await BountyChallenge.findByIdAndUpdate(challenge._id, {
      isUsed: true,
      usedAt: new Date()
    });

    // ── Auto-create user profile if this wallet is new ───────────────────────
    let user = await User.findOne({ walletAddress: submitterAddress });
    if (!user) {
      const suffix   = submitterAddress.slice(-8).toLowerCase();
      const username = `stx_${suffix}_${crypto.randomBytes(3).toString('hex')}`;
      const password = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        username,
        email:         `${submitterAddress.toLowerCase()}@stacks.auto`,
        password,
        walletAddress: submitterAddress,
        isVerified:    false
      }).catch(() => null);
    }

    // ── Create submission record ──────────────────────────────────────────────
    // Note: STX fee sponsoring (adding sponsor signature + broadcasting) requires
    // @stacks/transactions and a STX_SPONSOR_PRIVATE_KEY env var.
    // originSignedTxHex is stored as 'pending' for a separate broadcast service.
    const submission = await SponsoredBountySubmission.create({
      bountyId:             bounty._id,
      partnerKeyId:         req.partnerKey._id,
      submitterAddress,
      submitterUserId:      user ? user._id : null,
      originSignedTxHex,
      signedChallenge,
      challengeNonce,
      summary:              summary              || null,
      submissionUrl:        submissionUrl        || null,
      externalSubmissionId: externalSubmissionId || null,
      idempotencyKey,
      status:               'pending',
      txid:                 null
    });

    await Bounty.findByIdAndUpdate(id, { $inc: { totalSubmissions: 1 } });

    res.json({
      success: true,
      data: {
        bountyId:         bounty._id,
        submissionId:     submission._id,
        txid:             submission.txid,
        submitterAddress
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate: idempotency key or externalSubmissionId already used'
      });
    }
    console.error('[submitSponsoredEntry]', err);
    res.status(500).json({ success: false, error: 'Failed to submit entry' });
  }
}

module.exports = { createChallenge, submitSponsoredEntry };
