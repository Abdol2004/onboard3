const express    = require('express');
const router     = express.Router();
const partnerAuth = require('../middleware/partnerAuth');
const { createChallenge, submitSponsoredEntry } = require('../controllers/partnerBountyController');

// POST /api/public/auth/challenge
router.post('/auth/challenge', partnerAuth, createChallenge);

// POST /api/public/bounties/:id/submissions
router.post('/bounties/:id/submissions', partnerAuth, submitSponsoredEntry);

module.exports = router;
