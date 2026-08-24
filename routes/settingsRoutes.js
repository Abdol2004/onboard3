const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Settings routes
router.get("/", isAuthenticated, settingsController.getSettingsPage);
router.post("/profile", isAuthenticated, settingsController.updateProfile);
router.post("/password", isAuthenticated, settingsController.updatePassword);
router.post("/notifications", isAuthenticated, settingsController.updateNotifications);
router.post("/privacy", isAuthenticated, settingsController.updatePrivacy);
router.post("/wallet", isAuthenticated, settingsController.updateWallet);

// Profile picture upload (base64)
router.post("/avatar", isAuthenticated, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    if (!profilePicture) return res.json({ success: false, message: 'No image provided' });
    if (profilePicture.length > 800000) return res.json({ success: false, message: 'Image too large. Please use a smaller image (max ~600KB).' });
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.session.userId, { profilePicture });
    res.json({ success: true, message: 'Profile picture updated!' });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.json({ success: false, message: 'Error updating profile picture' });
  }
});

// Connect + verify X handle (free oEmbed API — no API key required)
router.post("/connect-x", isAuthenticated, async (req, res) => {
  try {
    const { xHandle } = req.body;
    if (!xHandle || xHandle.trim().length < 1) {
      return res.json({ success: false, message: 'Please enter your X username.' });
    }
    const clean = xHandle.replace('@', '').trim();
    if (!/^[a-zA-Z0-9_]{1,50}$/.test(clean)) {
      return res.json({ success: false, message: 'Invalid X username format. Only letters, numbers and underscores.' });
    }

    // ── Verify account is real using Twitter oEmbed (completely free, no API key) ──
    // This endpoint returns 404 if the account doesn't exist or is suspended
    let verified = false;
    try {
      const axios = require('axios');
      // Use a simple profile URL check — oEmbed returns user info for real accounts
      const oembedUrl = `https://publish.twitter.com/oembed?url=https://x.com/${clean}&omit_script=true`;
      const resp = await axios.get(oembedUrl, {
        timeout: 6000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ONBOARD3/1.0)' },
        validateStatus: s => s < 500
      });
      // 200 = account exists and is public
      // 404 = account not found
      // 403 = account suspended or protected
      if (resp.status === 200) {
        verified = true;
      } else if (resp.status === 404) {
        return res.json({ success: false, message: `@${clean} doesn't exist on X. Check the username and try again.` });
      } else if (resp.status === 403) {
        // Protected/suspended account — still allow (they own it) but flag
        verified = true;
      } else {
        // Unknown — allow but unverified
        verified = true;
      }
    } catch (axiosErr) {
      // If oEmbed check fails (network/timeout), still allow — don't block users
      console.warn('[ConnectX] oEmbed check failed, allowing anyway:', axiosErr.message);
      verified = true;
    }

    const User = require('../models/User');
    // Check no other user already registered this X handle
    const existing = await User.findOne({
      twitter: clean.toLowerCase(),
      twitterConnected: true,
      _id: { $ne: req.session.userId }
    });
    if (existing) {
      return res.json({ success: false, message: 'This X account is already linked to another ONBOARD3 user.' });
    }

    await User.findByIdAndUpdate(req.session.userId, {
      twitter: clean.toLowerCase(),
      twitterConnected: true,
      twitterVerifiedAt: new Date()
    });

    res.json({ success: true, message: `@${clean} verified and connected!` });
  } catch (err) {
    console.error('Connect X error:', err);
    res.json({ success: false, message: 'Error connecting X account. Please try again.' });
  }
});

// Check current connection status (called after returning from Telegram bot)
router.get("/connection-status", isAuthenticated, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.session.userId).select('twitterConnected telegramConnected twitter telegram').lean();
    res.json({
      success: true,
      twitterConnected: user.twitterConnected || false,
      telegramConnected: user.telegramConnected || false,
      twitter: user.twitter || '',
      telegram: user.telegram || ''
    });
  } catch (err) {
    res.json({ success: false });
  }
});

// Disconnect X
router.post("/disconnect-x", isAuthenticated, async (req, res) => {
  try {
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.session.userId, { twitter: '', twitterConnected: false });
    res.json({ success: true, message: 'X account disconnected.' });
  } catch (err) {
    res.json({ success: false, message: 'Error disconnecting X account.' });
  }
});

module.exports = router;