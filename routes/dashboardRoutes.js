const express = require("express");
const router = express.Router();
const crypto = require('crypto');
const dashboardController = require("../controllers/dashboardController");
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Force launch-day re-onboarding on every dashboard GET page.
// Skips API/JSON routes so fetch calls still work during onboarding.
const requireLaunchOnboarding = async (req, res, next) => {
  // Only enforce on GET page routes, not API calls
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  if (!req.session.userId) return next();
  try {
    const user = await User.findById(req.session.userId).select('onboardingCompleted launchDayCompleted').lean();
    if (!user) return next();
    if (!user.onboardingCompleted || !user.launchDayCompleted) {
      return res.redirect('/onboarding?launch=1');
    }
  } catch (_) {}
  next();
};

router.use(isAuthenticated, requireLaunchOnboarding);

// Dashboard routes
router.get("/", dashboardController.getDashboard);
router.post("/update-profile", isAuthenticated, dashboardController.updateProfile);
router.post("/add-quest", isAuthenticated, dashboardController.addQuest);
router.post("/complete-quest", isAuthenticated, dashboardController.completeQuest);

// Profile page
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect('/auth');
    }

    const { getUserRole } = require('../controllers/gamificationController');
    const roleData = getUserRole(user.xp, user.createdAt);

    res.render('dashboard/profile', {
      title: `${user.username}'s Profile`,
      user: user,
      roleData: roleData
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.redirect('/dashboard');
  }
});

// Monthly bonus removed
router.post("/api/claim-monthly-xp", isAuthenticated, (req, res) => {
  return res.json({ success: false, message: 'Monthly bonus has been removed.' });
});
router.get("/api/monthly-claim-status-disabled", isAuthenticated, (req, res) => {
  return res.json({ success: false });
});
/* REMOVED: monthly claim and status routes
router.post("/api/claim-monthly-xp-old", isAuthenticated, async (req, res) => {
  // Prevent caching
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  });

  try {
    const userId = req.session.userId;
    const User = require('../models/User');
    const { ROLES } = require('../config/gamification');

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Only allow claims on the 1st of each month (with 2-day grace period: 1st, 2nd, 3rd)
    if (currentDay > 3) {
      const nextMonth = new Date(currentYear, currentMonth + 1, 1);
      return res.json({
        success: false,
        message: 'Monthly XP can only be claimed on the 1st of each month',
        nextClaimDate: nextMonth,
        isNotFirstOfMonth: true
      });
    }

    // First, get user and CHECK if already claimed
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }

    // EXPLICIT CHECK: Has user already claimed this month?
    if (user.lastMonthlyClaimDate) {
      const lastClaimDate = new Date(user.lastMonthlyClaimDate);
      const lastClaimMonth = lastClaimDate.getMonth();
      const lastClaimYear = lastClaimDate.getFullYear();

      if (lastClaimMonth === currentMonth && lastClaimYear === currentYear) {
        console.log(`[SALARY] User ${userId} already claimed this month (${lastClaimDate.toISOString()})`);
        return res.json({
          success: false,
          message: 'Already claimed this month!',
          alreadyClaimed: true,
          nextClaimDate: new Date(currentYear, currentMonth + 1, 1)
        });
      }
    }

    // Calculate user's current role
    const xp = user.xp || 0;
    const roleOrder = ['core_team', 'major', 'legend', 'maxi', 'captain', 'contributor', 'citizen'];
    let currentRoleKey = 'citizen';

    for (const roleKey of roleOrder) {
      const roleData = ROLES[roleKey];
      if (!roleData || roleData.special) continue;

      if (xp >= roleData.minXP && (roleData.maxXP === Infinity || xp <= roleData.maxXP)) {
        currentRoleKey = roleKey;
        break;
      }
    }

    const currentRole = ROLES[currentRoleKey];
    const monthlyBonus = currentRole.benefits.monthlyBonus;

    if (!monthlyBonus || monthlyBonus <= 0) {
      return res.json({
        success: false,
        message: 'Your role does not have a monthly bonus'
      });
    }

    // Use atomic findOneAndUpdate with STRICT condition
    // The key is checking that lastMonthlyClaimDate is NOT in current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { lastMonthlyClaimDate: { $exists: false } },
          { lastMonthlyClaimDate: null },
          { lastMonthlyClaimDate: { $lt: startOfMonth } }
        ]
      },
      {
        $inc: { xp: monthlyBonus },
        $set: { lastMonthlyClaimDate: now },
        $push: {
          monthlyClaimHistory: {
            claimedAt: now,
            xpAwarded: monthlyBonus,
            role: currentRole.name
          }
        }
      },
      { new: true }
    );

    // If no user was updated, they already claimed
    if (!updatedUser) {
      console.log(`[SALARY] Atomic update failed for user ${userId} - already claimed`);
      return res.json({
        success: false,
        message: 'Already claimed this month!',
        alreadyClaimed: true,
        nextClaimDate: new Date(currentYear, currentMonth + 1, 1)
      });
    }

    console.log(`[SALARY] User ${userId} claimed ${monthlyBonus} XP. New total: ${updatedUser.xp}. lastMonthlyClaimDate: ${updatedUser.lastMonthlyClaimDate}`);

    // VERIFY the update actually persisted by reading back
    const verifyUser = await User.findById(userId).select('lastMonthlyClaimDate xp');
    console.log(`[SALARY] VERIFY - lastMonthlyClaimDate in DB: ${verifyUser.lastMonthlyClaimDate}, XP: ${verifyUser.xp}`);

    return res.json({
      success: true,
      xpAwarded: monthlyBonus,
      newTotalXP: updatedUser.xp,
      role: currentRole.name,
      message: `Claimed ${monthlyBonus.toLocaleString()} XP for ${currentRole.name} rank!`
    });

  } catch (error) {
    console.error('Error claiming monthly XP:', error);
    res.status(500).json({ success: false, error: 'Failed to claim monthly XP' });
  }
});

// Check monthly XP claim status
router.get("/api/monthly-claim-status", isAuthenticated, async (req, res) => {
  // Prevent caching - this must return fresh data per user
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const userId = req.session.userId;
    const User = require('../models/User');
    const { ROLES } = require('../config/gamification');

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: 'User not found', canClaim: false, alreadyClaimed: true });
    }

    // Calculate user's current role
    const xp = user.xp || 0;
    const roleOrder = ['core_team', 'major', 'legend', 'maxi', 'captain', 'contributor', 'citizen'];
    let currentRoleKey = 'citizen';

    for (const roleKey of roleOrder) {
      const roleData = ROLES[roleKey];
      if (!roleData || roleData.special) continue;

      if (xp >= roleData.minXP && (roleData.maxXP === Infinity || xp <= roleData.maxXP)) {
        currentRoleKey = roleKey;
        break;
      }
    }

    const currentRole = ROLES[currentRoleKey];
    const monthlyBonus = currentRole.benefits.monthlyBonus || 0;

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastClaim = user.lastMonthlyClaimDate;
    const isFirstOfMonth = currentDay <= 3;

    let canClaim = false;
    let alreadyClaimed = false;
    let nextClaimDate = new Date(currentYear, currentMonth + 1, 1);

    // Check if user has claimed this month
    if (lastClaim) {
      const lastClaimDate = new Date(lastClaim);
      const lastClaimMonth = lastClaimDate.getMonth();
      const lastClaimYear = lastClaimDate.getFullYear();

      if (lastClaimMonth === currentMonth && lastClaimYear === currentYear) {
        alreadyClaimed = true;
        canClaim = false;
      }
    }

    // Can only claim if: it's first 3 days of month AND not already claimed AND has bonus
    if (isFirstOfMonth && !alreadyClaimed && monthlyBonus > 0) {
      canClaim = true;
    }

    console.log(`[CLAIM-STATUS] User ${userId} - lastClaim: ${lastClaim}, alreadyClaimed: ${alreadyClaimed}, canClaim: ${canClaim}`);

    return res.json({
      success: true,
      canClaim,
      monthlyBonus,
      role: currentRole.name,
      roleColor: currentRole.color,
      lastClaimDate: lastClaim,
      nextClaimDate,
      alreadyClaimed,
      isFirstOfMonth,
      claimHistory: user.monthlyClaimHistory || []
    });

  } catch (error) {
    console.error('Error checking monthly claim status:', error);
    res.status(500).json({ success: false, error: 'Failed to check status', canClaim: false, alreadyClaimed: true });
  }
});
*/

// Welcome quest dismiss endpoint
router.post('/welcome-quest/dismiss', isAuthenticated, async (req, res) => {
  try {
    const WelcomeQuestProgress = require('../models/WelcomeQuestProgress');
    await WelcomeQuestProgress.findOneAndUpdate(
      { userId: req.session.userId },
      { dismissed: true, dismissedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[welcome-quest dismiss]', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;