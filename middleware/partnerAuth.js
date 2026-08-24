const PartnerApiKey = require('../models/PartnerApiKey');

async function partnerAuth(req, res, next) {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }

  try {
    const partnerKey = await PartnerApiKey.findByKey(rawKey);
    if (!partnerKey) {
      return res.status(401).json({ success: false, error: 'Invalid or inactive API key' });
    }

    // Non-blocking last-used update
    PartnerApiKey.findByIdAndUpdate(partnerKey._id, { lastUsedAt: new Date() }).catch(() => {});

    req.partnerKey = partnerKey;
    next();
  } catch (err) {
    console.error('[partnerAuth]', err);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

module.exports = partnerAuth;
