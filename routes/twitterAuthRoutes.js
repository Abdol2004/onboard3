const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const crypto   = require('crypto');
const User     = require('../models/User');

const CLIENT_ID     = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const BASE_URL      = process.env.BASE_URL || 'http://localhost:5000';
const CALLBACK_URL  = `${BASE_URL}/auth/twitter/callback`;

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/auth');
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function base64url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generatePKCE() {
    const verifier  = base64url(crypto.randomBytes(32));
    const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
}

// ── Step 1: Redirect to X authorization ──────────────────────────────────────
router.get('/connect', isAuthenticated, (req, res) => {
    if (!CLIENT_ID) {
        return res.redirect('/dashboard/quests?error=twitter_not_configured');
    }

    const { verifier, challenge } = generatePKCE();
    const state = base64url(crypto.randomBytes(16));

    // Store in session
    req.session.twitterPKCE  = verifier;
    req.session.twitterState = state;
    req.session.twitterUserId = req.session.userId; // which ONBOARD3 user is connecting

    const params = new URLSearchParams({
        response_type:          'code',
        client_id:              CLIENT_ID,
        redirect_uri:           CALLBACK_URL,
        scope:                  'users.read tweet.read',
        state:                  state,
        code_challenge:         challenge,
        code_challenge_method:  'S256'
    });

    res.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
});

// ── Step 2: Handle callback from X ───────────────────────────────────────────
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect('/dashboard/quests?error=twitter_denied');
    }

    // Validate state
    if (!state || state !== req.session.twitterState) {
        return res.redirect('/dashboard/quests?error=twitter_invalid_state');
    }

    const verifier = req.session.twitterPKCE;
    const onboard3UserId = req.session.twitterUserId || req.session.userId;

    if (!verifier || !onboard3UserId) {
        return res.redirect('/dashboard/quests?error=twitter_session_expired');
    }

    // Clean session
    delete req.session.twitterPKCE;
    delete req.session.twitterState;
    delete req.session.twitterUserId;

    try {
        // Exchange code for access token
        const tokenRes = await axios.post(
            'https://api.twitter.com/2/oauth2/token',
            new URLSearchParams({
                code,
                grant_type:    'authorization_code',
                redirect_uri:  CALLBACK_URL,
                code_verifier: verifier,
                client_id:     CLIENT_ID
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    // Use Basic Auth if client secret is set (confidential client)
                    ...(CLIENT_SECRET ? {
                        Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
                    } : {})
                },
                timeout: 10000
            }
        );

        const accessToken = tokenRes.data.access_token;

        // Get user info from X
        const userRes = await axios.get('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params:  { 'user.fields': 'id,username,name,profile_image_url,verified' },
            timeout: 8000
        });

        const xUser = userRes.data.data;
        const xId       = xUser.id;
        const xUsername = xUser.username.toLowerCase();

        // Check this X account isn't already linked to another ONBOARD3 user
        const existing = await User.findOne({
            twitterId:       xId,
            twitterConnected: true,
            _id: { $ne: onboard3UserId }
        });
        if (existing) {
            return res.redirect(`/dashboard/quests?error=twitter_already_linked&user=${existing.username}`);
        }

        // Link the verified X account
        await User.findByIdAndUpdate(onboard3UserId, {
            twitter:           xUsername,
            twitterId:         xId,
            twitterConnected:  true,
            twitterVerifiedAt: new Date()
        });

        // Restore session userId in case it was the connecting user
        req.session.userId = onboard3UserId;

        res.redirect('/dashboard/quests?twitter_connected=1');

    } catch (err) {
        console.error('[TwitterOAuth] Error:', err.response?.data || err.message);
        res.redirect('/dashboard/quests?error=twitter_failed');
    }
});

module.exports = router;
