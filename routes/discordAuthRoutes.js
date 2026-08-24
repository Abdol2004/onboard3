const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const User    = require('../models/User');

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BASE_URL      = process.env.BASE_URL || 'http://localhost:5000';
const CALLBACK_URL  = `${BASE_URL}/auth/discord/callback`;

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/auth');
};

// Step 1: Redirect to Discord OAuth
router.get('/connect', isAuthenticated, (req, res) => {
  if (!CLIENT_ID) {
    return res.redirect('/dashboard/quests?error=discord_not_configured');
  }

  req.session.discordConnectUserId = req.session.userId;

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  CALLBACK_URL,
    response_type: 'code',
    scope:         'identify'
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Step 2: Handle callback from Discord
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) return res.redirect('/dashboard/quests?error=discord_denied');

  const onboard3UserId = req.session.discordConnectUserId || req.session.userId;
  delete req.session.discordConnectUserId;

  if (!code || !onboard3UserId) {
    return res.redirect('/dashboard/quests?error=discord_session_expired');
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://discord.com/api/v10/oauth2/token',
      new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  CALLBACK_URL
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );

    const accessToken = tokenRes.data.access_token;

    // Get Discord user info
    const userRes = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 8000
    });

    const { id: discordId, username: discordUsername } = userRes.data;

    // Check if this Discord account is already linked to another ONBOARD3 user
    const existing = await User.findOne({
      discordId,
      discordConnected: true,
      _id: { $ne: onboard3UserId }
    });
    if (existing) {
      return res.redirect('/dashboard/quests?error=discord_already_linked');
    }

    await User.findByIdAndUpdate(onboard3UserId, {
      discordId,
      discordUsername,
      discordConnected:   true,
      discordConnectedAt: new Date()
    });

    req.session.userId = onboard3UserId;
    res.redirect('/dashboard/quests?discord_connected=1');

  } catch (err) {
    console.error('[DiscordOAuth] Error:', err.response?.data || err.message);
    res.redirect('/dashboard/quests?error=discord_failed');
  }
});

module.exports = router;
