const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { notify } = require('../utils/notificationService');

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/auth');
};

// Show onboarding page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) return res.redirect('/auth');

    // Already done everything — go to dashboard
    if (user.onboardingCompleted && user.launchDayCompleted) return res.redirect('/dashboard');

    // It's a launch-day run if they haven't done it yet (new field, false for everyone on first deploy)
    const isLaunchDay = !user.launchDayCompleted;

    // Mark session so /complete knows this is a launch-day run
    if (isLaunchDay) req.session.isLaunchOnboarding = true;

    const OnboardingConfig = require('../models/OnboardingConfig');
    const config = await OnboardingConfig.get();

    res.render('onboarding', {
      user: user.toObject(),
      isLaunchDay: isLaunchDay || false,
      obConfig: {
        step4Title:        config.step4Title,
        step4Desc:         config.step4Desc,
        step4ShareTitle:   config.step4ShareTitle,
        step4ShareSubtitle:config.step4ShareSubtitle,
        step5Title:        config.step5Title,
        step5Eyebrow:      config.step5Eyebrow,
        step5Desc:         config.step5Desc,
        tasks:             config.tasks || [],
        extraTasks:        config.extraTasks || []
      }
    });
  } catch (err) {
    console.error('Onboarding page error:', err);
    res.redirect('/dashboard');
  }
});

// Set pathway (with XP-based auto-approve or pending application)
router.post('/pathway', isAuthenticated, async (req, res) => {
  try {
    const { pathway, reason, experience } = req.body;
    if (!['web3_jobs', 'ai', 'building', 'nft', 'trading'].includes(pathway))
      return res.json({ success: false, message: 'Invalid pathway' });

    const user = await User.findById(req.session.userId).select('xp pathway pathwayStatus');
    const XP_THRESHOLD = 10000;
    const autoApprove  = (user.xp || 0) >= XP_THRESHOLD;

    const updates = { pathway };

    if (autoApprove) {
      updates.pathwayStatus = 'auto_approved';
    } else {
      if (!reason || !experience) {
        return res.json({ success: false, needsApplication: true, message: 'Application required' });
      }
      updates.pathwayStatus      = 'pending';
      updates.pathwayApplication = { reason, experience, appliedAt: new Date() };
    }

    await User.findByIdAndUpdate(req.session.userId, updates);
    res.json({ success: true, autoApproved: autoApprove });
  } catch {
    res.json({ success: false, message: 'Error saving pathway' });
  }
});

// Save profile during onboarding
router.post('/profile', isAuthenticated, async (req, res) => {
  try {
    const { twitter, bio, walletAddress, github, profilePicture } = req.body;
    const updates = {};
    if (twitter)        updates.twitter        = twitter.replace('@', '').trim();
    if (bio)            updates.bio            = bio.trim();
    if (walletAddress)  updates.walletAddress  = walletAddress.trim();
    if (github)         updates.github         = github.replace('@', '').trim();
    if (profilePicture) updates.profilePicture = profilePicture;
    await User.findByIdAndUpdate(req.session.userId, updates);
    res.json({ success: true });
  } catch {
    res.json({ success: false, message: 'Error saving profile' });
  }
});

// Complete onboarding — handles both first-time and launch-day re-onboarding
router.post('/complete', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ success: false, message: 'User not found' });

    const isLaunchDay = !user.launchDayCompleted;
    const LaunchReward = require('../models/LaunchReward');

    // ── LAUNCH-DAY RE-ONBOARDING ─────────────────────────────────────────────
    if (isLaunchDay && !user.launchDayCompleted) {
      // Look up their pre-calculated reward
      let reward = 0;
      const launchRecord = await LaunchReward.findOne({ userId: user._id, status: 'pending' });

      if (launchRecord) {
        reward = launchRecord.amount;
        // Credit their in-app USDC balance
        await User.collection.updateOne(
          { _id: user._id },
          { $inc: { usdcBalance: reward } }
        );
        await LaunchReward.updateOne(
          { _id: launchRecord._id },
          { $set: { status: 'sent', sentAt: new Date() } }
        );
      } else {
        // New user joining today — give them a small welcome reward
        reward = 0.10;
        await User.collection.updateOne(
          { _id: user._id },
          { $inc: { usdcBalance: reward } }
        );
        // Create a record so it's tracked
        await LaunchReward.create({
          userId: user._id,
          username: user.username,
          amount: reward,
          tier: 'new_launch_day',
          xp: user.xp || 0,
          twitterHandle: user.twitter || null,
          status: 'sent',
          sentAt: new Date()
        }).catch(() => {});
      }

      // Mark launch-day done (and also mark normal onboarding done for new users)
      const updates = {
        launchDayCompleted: true,
        launchDayReward: reward
      };
      if (!user.onboardingCompleted) {
        updates.onboardingCompleted = true;
        updates.onboardingReward = 0;
      }
      await User.collection.updateOne({ _id: user._id }, { $set: updates });
      req.session.isLaunchOnboarding = false;

      // Notify referrer if new user
      if (!user.onboardingCompleted && user.referredBy) {
        try {
          const referrer = await User.findOne({ referralCode: user.referredBy }).select('_id');
          if (referrer) {
            notify(referrer._id, {
              type: 'referral',
              title: 'New Referral Onboarded!',
              message: `${user.username} just completed onboarding using your referral link!`,
              link: '/dashboard/referral'
            }).catch(() => {});
          }
        } catch (_) {}
      }

      notify(user._id, {
        type: 'reward',
        title: `$${reward.toFixed(2)} Launch Reward Credited!`,
        message: `You earned $${reward.toFixed(2)} USDC for completing the ONBOARD3 launch onboarding! Complete quests and bounties to earn more.`,
        link: '/dashboard/wallet'
      }).catch(() => {});

      return res.json({ success: true, reward, isLaunchDay: true });
    }

    // ── FIRST-TIME ONBOARDING (already launch-day done, shouldn't happen often) ──
    if (user.onboardingCompleted) {
      return res.json({ success: true, reward: user.onboardingReward || 0 });
    }

    user.onboardingCompleted = true;
    user.onboardingReward    = 0;
    user.launchDayCompleted  = true;
    user.launchDayReward     = 0;
    if (!user.recentActivity) user.recentActivity = [];
    user.recentActivity.unshift({ action: 'Completed onboarding', timestamp: new Date() });
    if (user.recentActivity.length > 10) user.recentActivity = user.recentActivity.slice(0, 10);
    await user.save();

    if (user.referredBy) {
      try {
        const referrer = await User.findOne({ referralCode: user.referredBy }).select('_id');
        if (referrer) {
          notify(referrer._id, {
            type: 'referral',
            title: 'New Referral Onboarded!',
            message: `${user.username} just completed onboarding using your referral link!`,
            link: '/dashboard/referral'
          }).catch(() => {});
        }
      } catch (_) {}
    }

    notify(user._id, {
      type: 'system',
      title: 'Welcome to ONBOARD3!',
      message: `You've completed onboarding! Start completing quests to earn USDC rewards!`,
      link: '/dashboard/quests'
    }).catch(() => {});

    res.json({ success: true, reward: 0 });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    res.json({ success: false, message: 'Error completing onboarding' });
  }
});

// ── Admin: get/set pathway community links ─────────────────────────────────
const PathwayConfig = require('../models/PathwayConfig');

router.get('/admin/pathway-config', async (req, res) => {
  try {
    const configs = await PathwayConfig.find();
    res.json({ success: true, configs });
  } catch {
    res.json({ success: false, configs: [] });
  }
});

router.post('/admin/pathway-config', async (req, res) => {
  try {
    const { pathway, groupLink, channelLink, xLink, description } = req.body;
    if (!['web3_jobs', 'ai', 'building', 'nft', 'trading'].includes(pathway))
      return res.json({ success: false, message: 'Invalid pathway' });
    await PathwayConfig.findOneAndUpdate(
      { pathway },
      { pathway, groupLink, channelLink, xLink, description },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Pathway config saved' });
  } catch {
    res.json({ success: false, message: 'Error saving config' });
  }
});

// Public: get single pathway config (for dashboard Join Community link)
router.get('/pathway-config/:pathway', async (req, res) => {
  try {
    const config = await PathwayConfig.findOne({ pathway: req.params.pathway });
    res.json({ success: true, config: config || null });
  } catch {
    res.json({ success: false, config: null });
  }
});

module.exports = router;
