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

router.use(isAuthenticated);

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
    const roleOrder = ['major', 'legend', 'ambassador', 'contributor', 'citizen'];
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
    const roleOrder = ['major', 'legend', 'ambassador', 'contributor', 'citizen'];
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

// ── Career Paths ──────────────────────────────────────────────────────────────
const PATHWAY_META = {
  web3_jobs: { name:'Web3 Jobs',             icon:'fa-briefcase',  color:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.3)',  tagline:'Find and land opportunities in Web3.' },
  ai:        { name:'AI & Web3',             icon:'fa-microchip',  color:'#c084fc', bg:'rgba(168,85,247,0.1)',  border:'rgba(168,85,247,0.3)',  tagline:'Explore the intersection of AI and Web3.' },
  nft:       { name:'NFTs & Digital Assets', icon:'fa-image',      color:'#f472b6', bg:'rgba(236,72,153,0.1)',  border:'rgba(236,72,153,0.3)',  tagline:'Create, trade and collect digital assets.' },
  trading:   { name:'Trading',               icon:'fa-chart-line', color:'#10b981', bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.3)',  tagline:'Master markets and trading strategies.' }
};

router.get('/career-paths', isAuthenticated, async (req, res) => {
  try {
    const PathwayConfig  = require('../models/PathwayConfig');
    const PathwayContent = require('../models/PathwayContent');

    const user = await User.findById(req.session.userId).select('-password').lean();

    // Only show the user's own pathway; if none selected, show empty state
    const PATHWAYS = user.pathway ? [user.pathway] : [];

    const [configs, counts, liveSet] = await Promise.all([
      PathwayConfig.find({ pathway: { $in: PATHWAYS } }).lean(),
      PathwayContent.aggregate([
        { $match: { isPublished: true, pathway: { $in: PATHWAYS } } },
        { $group: { _id: '$pathway', count: { $sum: 1 } } }
      ]),
      PathwayContent.distinct('pathway', { isLive: true, isPublished: true, pathway: { $in: PATHWAYS } })
    ]);

    const leadIds = configs.map(c => c.leadUserId).filter(Boolean);
    const leads   = leadIds.length ? await User.find({ _id: { $in: leadIds } }).select('username profilePicture').lean() : [];
    const leadMap = {}; leads.forEach(l => { leadMap[l._id.toString()] = l; });
    const cfgMap  = {}; configs.forEach(c => { cfgMap[c.pathway] = c; });
    const cntMap  = {}; counts.forEach(c => { cntMap[c._id] = c.count; });

    res.render('dashboard/career-paths', {
      title: 'Career Paths — ONBOARD3',
      user, PATHWAYS, PATHWAY_META, cfgMap, cntMap, liveSet, leadMap,
      currentPage: 'career-paths', pathwaySlug: null
    });
  } catch (err) {
    console.error('[career-paths]', err);
    res.redirect('/dashboard');
  }
});

router.get('/career-paths/comments/:contentId', isAuthenticated, async (req, res) => {
  try {
    const PathwayComment = require('../models/PathwayComment');
    const comments = await PathwayComment.find({ contentId: req.params.contentId })
      .sort({ createdAt: 1 }).limit(100).lean();
    res.json({ success: true, comments });
  } catch (err) { res.status(500).json({ success: false, comments: [] }); }
});

router.post('/career-paths/comment', isAuthenticated, async (req, res) => {
  try {
    const { contentId, pathway, text } = req.body;
    if (!text?.trim() || !contentId) return res.json({ success: false });
    const PathwayComment = require('../models/PathwayComment');
    const user = await User.findById(req.session.userId).select('username profilePicture').lean();
    const comment = await PathwayComment.create({
      contentId, pathway: pathway || '',
      userId: req.session.userId,
      username: user.username,
      profilePicture: user.profilePicture || null,
      text: text.trim().slice(0, 500)
    });
    res.json({ success: true, comment: comment.toObject() });
  } catch (err) { console.error('[comment]', err); res.status(500).json({ success: false }); }
});

router.get('/career-paths/:pathway', isAuthenticated, async (req, res) => {
  try {
    const { pathway } = req.params;
    if (!PATHWAY_META[pathway]) return res.redirect('/dashboard/career-paths');

    const PathwayConfig  = require('../models/PathwayConfig');
    const PathwayContent = require('../models/PathwayContent');

    const user = await User.findById(req.session.userId).select('-password').lean();
    const [config, content] = await Promise.all([
      PathwayConfig.findOne({ pathway }).lean(),
      PathwayContent.find({ pathway, isPublished: true })
        .sort({ isPinned: -1, isLive: -1, createdAt: -1 })
        .lean()
    ]);

    let lead = null;
    if (config?.leadUserId) {
      lead = await User.findById(config.leadUserId).select('username profilePicture').lean();
    }

    const now = new Date();
    const liveItems  = content.filter(c => c.isLive);
    const upcoming   = content.filter(c => !c.isLive && c.scheduledAt && new Date(c.scheduledAt) > now)
                               .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    const updates      = content.filter(c => c.section === 'update'      && !c.isLive);
    const resources    = content.filter(c => c.section === 'resource');
    const opportunities = content.filter(c => c.section === 'opportunity');

    res.render('dashboard/pathway-detail', {
      title: `${PATHWAY_META[pathway].name} — ONBOARD3`,
      user, pathway, meta: PATHWAY_META[pathway],
      config: config || {},
      lead, liveItems, upcoming, updates, resources, opportunities,
      currentPage: 'career-paths', pathwaySlug: pathway
    });
  } catch (err) {
    console.error('[pathway-detail]', err);
    res.redirect('/dashboard/career-paths');
  }
});

// ── Pathway selection ─────────────────────────────────────────────────────────
const VALID_PATHWAYS = ['web3_jobs', 'ai', 'nft', 'trading'];

router.post('/select-pathway', isAuthenticated, async (req, res) => {
  try {
    const { pathway } = req.body;
    if (!VALID_PATHWAYS.includes(pathway))
      return res.json({ success: false, message: 'Invalid pathway.' });

    const SiteSettings = require('../models/SiteSettings');
    const settings = await SiteSettings.getSettings();
    const approvalMode = settings.pathwayApprovalMode || 'auto';

    const update = {
      pathway,
      pathwayStatus: approvalMode === 'auto' ? 'auto_approved' : 'pending',
      'pathwayApplication.appliedAt': new Date()
    };

    await User.findByIdAndUpdate(req.session.userId, { $set: update });

    const config = await require('../models/PathwayConfig').findOne({ pathway }).lean();
    res.json({
      success: true,
      status: update.pathwayStatus,
      groupLink: config?.groupLink || null,
      xLink: config?.xLink || null
    });
  } catch (err) {
    console.error('[select-pathway]', err);
    res.status(500).json({ success: false, message: 'Error saving pathway.' });
  }
});

// Returns community links for a pathway (used by Join Community button)
router.get('/pathway-config/:pathway', async (req, res) => {
  try {
    const config = await require('../models/PathwayConfig').findOne({ pathway: req.params.pathway }).lean();
    res.json({ success: true, config: config || {} });
  } catch (err) {
    res.json({ success: false, config: {} });
  }
});

module.exports = router;