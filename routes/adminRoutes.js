// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const pages = require("../controllers/adminPagesController");
const QuestApplication = require('../models/QuestApplication');

// ==================== MIDDLEWARE ====================

// Role-based permission map
const ROLE_PERMISSIONS = {
  super_admin:  '*',
  operations:   ['overview','analytics','users','quests','bounties','events','withdrawals','applications','quest-applications','pathway-applications','support','ambassadors','projects','banned','leaderboard','business-developers','businesses','fund-requests','wallet-addresses','commission-settings','welcome-quest','platform-settings','settings','partners'],
  community:    ['overview','analytics','users','applications','quest-applications','pathway-applications','support','ambassadors','banned','leaderboard'],
  partnerships: ['overview','analytics','quests','bounties','projects','partners','business-developers','businesses','fund-requests','commission-settings'],
  finance:      ['overview','analytics','withdrawals','fund-requests','wallet-addresses'],
};

function getAdminRole(user) {
  if (!user || !user.isAdmin) return null;
  return user.adminRole || 'super_admin';
}

function canAccess(role, section) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (perms === '*') return true;
  return Array.isArray(perms) && perms.includes(section);
}

// Admin authentication middleware (JSON APIs)
const isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    if (!user || !user.isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });
    req.user = user;
    req.adminRole = getAdminRole(user);
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════
// MULTI-PAGE ADMIN ROUTES (server-side rendered)
// ══════════════════════════════════════════════════════

// Auto-map URL path → permission section
const PATH_SECTION_MAP = {
  'analytics': 'analytics', 'users': 'users', 'quests': 'quests', 'bounties': 'bounties',
  'events': 'events', 'withdrawals': 'withdrawals', 'applications': 'applications',
  'ambassadors': 'ambassadors', 'projects': 'projects', 'banned': 'banned',
  'settings': 'settings', 'pathway-applications': 'pathway-applications',
  'quest-applications': 'quest-applications', 'support': 'support', 'leaderboard': 'leaderboard',
  'business-developers': 'business-developers', 'businesses': 'businesses',
  'fund-requests': 'fund-requests', 'wallet-addresses': 'wallet-addresses',
  'commission-settings': 'commission-settings', 'welcome-quest': 'welcome-quest',
  'platform-settings': 'platform-settings', 'partners': 'partners',
};

// Page middleware — redirects to /auth for HTML pages, enforces role permissions
const isAdminPage = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/auth');
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    if (!user || !user.isAdmin) return res.redirect('/dashboard');
    req.user = user;
    req.adminRole = getAdminRole(user);
    // Auto-check permission based on URL path segment
    const segment = req.path.replace(/^\//, '').split('/')[0];
    const section = PATH_SECTION_MAP[segment];
    if (section && !canAccess(req.adminRole, section)) {
      const isJson = req.headers.accept && req.headers.accept.includes('application/json');
      return isJson
        ? res.status(403).json({ success: false, message: 'Access denied' })
        : res.redirect('/admin?error=access_denied');
    }
    next();
  } catch { res.redirect('/auth'); }
};

// Role-specific page guard — call after isAdminPage
const requireSection = (section) => (req, res, next) => {
  if (!canAccess(req.adminRole, section)) return res.redirect('/admin?error=access_denied');
  next();
};

router.get('/analytics',            isAdminPage, requireSection('analytics'),            pages.analyticsPage);
router.get('/',                     isAdminPage,                                            pages.overview);
router.get('/users',                isAdminPage, requireSection('users'),                   pages.usersPage);
router.get('/quests',               isAdminPage, requireSection('quests'),                  pages.questsPage);
router.get('/events',               isAdminPage, requireSection('events'),                  pages.eventsPage);
router.get('/withdrawals',          isAdminPage, requireSection('withdrawals'),              pages.withdrawalsPage);
router.get('/applications',         isAdminPage, requireSection('applications'),             pages.applicationsPage);
router.get('/ambassadors',          isAdminPage, requireSection('ambassadors'),              pages.ambassadorsPage);
router.get('/projects',             isAdminPage, requireSection('projects'),                 pages.projectsPage);
router.get('/banned',               isAdminPage, requireSection('banned'),                   pages.bannedPage);
router.get('/settings',             isAdminPage, requireSection('settings'),                 pages.settingsPage);
router.get('/pathway-applications', isAdminPage, requireSection('pathway-applications'),     pages.pathwayApplicationsPage);

// ── Team Management (super_admin only) ────────────────────────────────────────
router.get('/team', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.redirect('/admin?error=access_denied');
  try {
    const User = require('../models/User');
    const team = await User.find({ isAdmin: true }).select('username email adminRole createdAt').sort({ createdAt: -1 }).lean();
    res.render('admin/pages/team', { user: req.user, team, page: 'team' });
  } catch (err) { console.error(err); res.redirect('/admin'); }
});

router.post('/team/assign', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false, message: 'Access denied' });
  try {
    const User = require('../models/User');
    const { userId, adminRole } = req.body;
    const validRoles = ['super_admin', 'operations', 'community', 'partnerships', 'finance'];
    if (!validRoles.includes(adminRole)) return res.json({ success: false, message: 'Invalid role' });
    const target = await User.findById(userId);
    if (!target) return res.json({ success: false, message: 'User not found' });
    target.isAdmin  = true;
    target.adminRole = adminRole;
    await target.save();
    res.json({ success: true, message: `${target.username} assigned as ${adminRole.replace('_',' ')}` });
  } catch (err) { res.json({ success: false, message: 'Server error' }); }
});

router.post('/team/remove', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false, message: 'Access denied' });
  try {
    const User = require('../models/User');
    const { userId } = req.body;
    if (userId === req.user._id.toString()) return res.json({ success: false, message: 'Cannot remove yourself' });
    await User.findByIdAndUpdate(userId, { isAdmin: false, adminRole: null });
    res.json({ success: true, message: 'Admin access removed' });
  } catch (err) { res.json({ success: false, message: 'Server error' }); }
});

router.get('/team/search', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ users: [] });
  try {
    const User = require('../models/User');
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const users = await User.find({
      $or: [{ username: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]
    }).select('username email adminRole isAdmin').limit(8).lean();
    res.json({ users });
  } catch (err) { res.json({ users: [] }); }
});

// Page actions
router.post('/quests/create',                         isAdminPage, pages.createQuestPage);
router.post('/quests/:id/toggle',                     isAdminPage, pages.toggleQuestPage);
router.post('/quests/:id/delete',                     isAdminPage, pages.deleteQuestPage);
router.post('/quests/:id/add-task',                   isAdminPage, pages.addQuestTask);
router.get( '/quests/:id/entries',                    isAdminPage, pages.getQuestEntries);
router.post('/quests/:id/users/:userId/bonus-xp',     isAdminPage, pages.awardBonusXp);
router.post('/quests/:id/submissions/:progressId/review', isAdminPage, pages.reviewTaskSubmission);
router.post('/quests/:id/update-settings',            isAdminPage, pages.updateQuestSettings);

// ── Business quest approval ───────────────────────────────────────────────────
router.post('/business-quests/:id/approve', isAdminPage, async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return res.redirect('/admin/quests?error=not_found');
    quest.approvalStatus = 'approved';
    quest.approvalNote   = '';
    quest.isActive       = true;
    await quest.save();
    res.redirect('/admin/quests?approved=1');
  } catch (err) { console.error(err); res.redirect('/admin/quests?error=1'); }
});

router.post('/business-quests/:id/reject', isAdminPage, async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return res.redirect('/admin/quests?error=not_found');
    const reason = (req.body.reason || '').trim() || 'Does not meet platform guidelines.';
    quest.approvalStatus = 'rejected';
    quest.approvalNote   = reason;
    quest.isActive       = false;
    await quest.save();
    // Refund business
    if (quest.sponsoredBy && quest.usdcReward > 0) {
      await Business.findByIdAndUpdate(quest.sponsoredBy, {
        $inc: { balance: quest.usdcReward, totalSpent: -quest.usdcReward }
      });
    }
    res.redirect('/admin/quests?rejected=1');
  } catch (err) { console.error(err); res.redirect('/admin/quests?error=1'); }
});
router.post('/events/create',              isAdminPage, requireSection('events'),            pages.createEventPage);
router.post('/events/:id/delete',          isAdminPage, requireSection('events'),            pages.deleteEventPage);
router.post('/withdrawals/:id/approve',    isAdminPage, requireSection('withdrawals'),        pages.approveWithdrawal);
router.post('/withdrawals/:id/reject',     isAdminPage, requireSection('withdrawals'),        pages.rejectWithdrawal);
router.post('/users/:id/ban',              isAdminPage, requireSection('users'),              pages.banUser);
router.post('/users/:id/unban',            isAdminPage, requireSection('users'),              pages.unbanUser);
router.post('/applications/:id/approve',   isAdminPage, requireSection('applications'),       pages.approveApplication);
router.post('/applications/:id/reject',    isAdminPage, requireSection('applications'),       pages.rejectApplication);
router.post('/ambassadors/:id/approve',    isAdminPage, requireSection('ambassadors'),        pages.approveAmbassador);
router.post('/ambassadors/:id/reject',     isAdminPage, requireSection('ambassadors'),        pages.rejectAmbassador);
router.post('/projects/:id/approve',       isAdminPage, requireSection('projects'),           pages.approveProject);
router.post('/projects/:id/reject',        isAdminPage, requireSection('projects'),           pages.rejectProject);
router.post('/settings/pathways',                    isAdminPage, requireSection('settings'),             pages.savePathways);
router.post('/pathway-applications/:id/approve',     isAdminPage, requireSection('pathway-applications'), pages.approvePathwayApplication);
router.post('/pathway-applications/:id/reject',      isAdminPage, requireSection('pathway-applications'), pages.rejectPathwayApplication);

// ── Business Quest Approve/Reject ─────────────────────

router.post('/business-quests/:id/approve', isAdminPage, async (req, res) => {
  try {
    const _Quest = require('../models/Quest');
    const quest = await _Quest.findById(req.params.id);
    if (!quest) return res.redirect('/admin/quests?error=not_found');
    quest.approvalStatus = 'approved';
    quest.isActive = true;
    await quest.save();
    res.redirect('/admin/quests?success=quest_approved');
  } catch (err) {
    console.error('[Admin] Approve business quest error:', err);
    res.redirect('/admin/quests?error=server');
  }
});

router.post('/business-quests/:id/reject', isAdminPage, async (req, res) => {
  try {
    const _Quest    = require('../models/Quest');
    const _Business = require('../models/Business');
    const quest = await _Quest.findById(req.params.id);
    if (!quest) return res.redirect('/admin/quests?error=not_found');
    quest.approvalStatus = 'rejected';
    quest.approvalNote = req.body.reason || '';
    quest.isActive = false;
    await quest.save();
    // Refund business
    if (quest.sponsoredBy) {
      const business = await _Business.findById(quest.sponsoredBy);
      if (business) {
        business.balance += quest.usdcReward || 0;
        business.totalSpent -= quest.usdcReward || 0;
        if (business.totalSpent < 0) business.totalSpent = 0;
        await business.save();
      }
    }
    res.redirect('/admin/quests?success=quest_rejected');
  } catch (err) {
    console.error('[Admin] Reject business quest error:', err);
    res.redirect('/admin/quests?error=server');
  }
});

// ── Bounties ──────────────────────────────────────────
const bc = require('../controllers/bountyController');
router.get('/bounties',                   isAdminPage, bc.adminListBounties);
router.post('/bounties/create',           isAdminPage, bc.adminCreateBounty);
router.get('/bounties/:id',               isAdminPage, bc.adminBountyDetail);
router.post('/bounties/:id/toggle',       isAdminPage, bc.adminToggleBounty);
router.post('/bounties/:id/winners',      isAdminPage, bc.adminAnnounceWinners);
router.post('/bounties/:id/delete',       isAdminPage, bc.adminDeleteBounty);

// ── Onboarding Quest Config ────────────────────────────
const OnboardingConfig = require('../models/OnboardingConfig');
const PlatformSettings = require('../models/PlatformSettings');

// Render onboarding quest admin page
router.get('/welcome-quest', isAdminPage, async (req, res) => {
  try {
    const config = await OnboardingConfig.get();
    res.render('admin/pages/welcome-quest', { user: req.user, config: config.toObject(), query: req.query });
  } catch (err) {
    console.error('[admin welcome-quest]', err);
    res.status(500).send('Error: ' + err.message);
  }
});

// Save a single task by taskId
router.post('/welcome-quest/task/:taskId', isAdminPage, async (req, res) => {
  try {
    const { title, subtitle, link, btnLabel } = req.body;
    const config = await OnboardingConfig.get();
    const task = config.tasks.find(t => t.taskId === req.params.taskId);
    if (!task) return res.redirect('/admin/welcome-quest?error=notfound');
    task.title    = title    || task.title;
    task.subtitle = subtitle != null ? subtitle : task.subtitle;
    task.link     = link     || task.link;
    task.btnLabel = btnLabel || task.btnLabel;
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// Delete a fixed task by taskId
router.post('/welcome-quest/task/:taskId/delete', isAdminPage, async (req, res) => {
  try {
    const config = await OnboardingConfig.get();
    const before = config.tasks.length;
    config.tasks = config.tasks.filter(t => t.taskId !== req.params.taskId);
    if (config.tasks.length === before) return res.redirect('/admin/welcome-quest?error=notfound');
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// Save step 4 header
router.post('/welcome-quest/step4-header', isAdminPage, async (req, res) => {
  try {
    const { step4Title, step4Desc } = req.body;
    const config = await OnboardingConfig.get();
    if (step4Title) config.step4Title = step4Title;
    if (step4Desc)  config.step4Desc  = step4Desc;
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// Save step 4 share task fields
router.post('/welcome-quest/step4-share', isAdminPage, async (req, res) => {
  try {
    const { step4ShareTitle, step4ShareSubtitle } = req.body;
    const config = await OnboardingConfig.get();
    if (step4ShareTitle)    config.step4ShareTitle    = step4ShareTitle;
    if (step4ShareSubtitle) config.step4ShareSubtitle = step4ShareSubtitle;
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// Save step 5 header
router.post('/welcome-quest/step5-header', isAdminPage, async (req, res) => {
  try {
    const { step5Title, step5Eyebrow, step5Desc } = req.body;
    const config = await OnboardingConfig.get();
    if (step5Title)   config.step5Title   = step5Title;
    if (step5Eyebrow) config.step5Eyebrow = step5Eyebrow;
    if (step5Desc)    config.step5Desc    = step5Desc;
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// Add an extra task (iOS/Android/etc.)
router.post('/welcome-quest/extra-task', isAdminPage, async (req, res) => {
  try {
    const { step, title, subtitle, link, btnLabel } = req.body;
    const config = await OnboardingConfig.get();
    config.extraTasks.push({ step: Number(step), title, subtitle: subtitle || '', link, btnLabel: btnLabel || 'Go', order: config.extraTasks.length });
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// Delete an extra task
router.post('/welcome-quest/extra-task/:id/delete', isAdminPage, async (req, res) => {
  try {
    const config = await OnboardingConfig.get();
    config.extraTasks.pull({ _id: req.params.id });
    await config.save();
    res.redirect('/admin/welcome-quest?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/welcome-quest?error=1');
  }
});

// POST /admin/stacks-wallets/test-zad-auth — test ZAD authentication flow for index 0
router.post('/stacks-wallets/test-zad-auth', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false, message: 'Unauthorized' });
  try {
    const sw = require('../utils/stacksWallet');
    const { bountyId } = req.body;
    const result = await sw.submitToZADWebAPI(
      null, // privKey — will be derived from index 0 internally
      bountyId || '1a9af04e-14d8-4f3e-bea6-e62a92935b0b',
      'Test submission from ONBOARD3 integration test',
      null,
      'test-tx-' + Date.now()
    );
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: false, message: err.message, stack: err.stack?.slice(0, 500) });
  }
});

// DELETE /admin/submissions/external/:bountyId/:userId — remove a third-party submission
router.post('/submissions/external/delete', isAdminPage, async (req, res) => {
  try {
    const ThirdPartySubmission = require('../models/ThirdPartySubmission');
    const { bountyId, userId, deleteAll } = req.body;
    const query = {};
    if (!deleteAll) {
      if (bountyId) query.externalBountyId = bountyId;
      if (userId)   query.userId = userId;
      if (!bountyId && !userId) return res.json({ success: false, message: 'Provide bountyId, userId, or deleteAll:true' });
    }
    const result = await ThirdPartySubmission.deleteMany(query);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /admin/welcome-quest/reset-all — reset onboarding for every user
router.post('/welcome-quest/reset-all', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false, message: 'Unauthorized' });
  try {
    const User = require('../models/User');
    const result = await User.updateMany({}, { $set: { onboardingCompleted: false, onboardingReward: null } });
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    console.error('[reset-onboarding-all]', err);
    res.json({ success: false, message: err.message });
  }
});

// ── Platform Settings ─────────────────────────────────
// Render platform settings page
router.get('/platform-settings', isAdminPage, async (req, res) => {
  try {
    const settings = await PlatformSettings.get();
    res.render('admin/pages/platform-settings', { user: req.user, settings: settings.toObject() });
  } catch (err) {
    console.error('[admin platform-settings]', err);
    res.status(500).send('Error loading platform settings');
  }
});

// Save platform settings
router.post('/platform-settings', isAdminPage, async (req, res) => {
  try {
    const { apeitWalletUrl, withdrawalMin, feeTierSmall, feeTierSmallUpTo, feeTierMedium, feeTierMediumUpTo, feeTierLarge } = req.body;
    const settings = await PlatformSettings.get();
    if (apeitWalletUrl)    settings.apeitWalletUrl    = apeitWalletUrl;
    if (withdrawalMin)     settings.withdrawalMin     = parseFloat(withdrawalMin);
    if (feeTierSmall)      settings.feeTierSmall      = parseFloat(feeTierSmall);
    if (feeTierSmallUpTo)  settings.feeTierSmallUpTo  = parseFloat(feeTierSmallUpTo);
    if (feeTierMedium)     settings.feeTierMedium     = parseFloat(feeTierMedium);
    if (feeTierMediumUpTo) settings.feeTierMediumUpTo = parseFloat(feeTierMediumUpTo);
    if (feeTierLarge)      settings.feeTierLarge      = parseFloat(feeTierLarge);
    await settings.save();
    res.redirect('/admin/platform-settings?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/platform-settings?error=1');
  }
});

// ── Partner API Key Management (JSON) ─────────────────
const PartnerApiKey              = require('../models/PartnerApiKey');
const SponsoredBountySubmission  = require('../models/SponsoredBountySubmission');

// List all partner keys
router.get('/api/partner-keys', isAdmin, async (req, res) => {
  try {
    const keys = await PartnerApiKey.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate a new partner API key
// Body: { name, allowedBounties?, notes? }
router.post('/api/partner-keys', isAdmin, async (req, res) => {
  try {
    const { name, allowedBounties = [], notes = '' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const { rawKey, doc } = PartnerApiKey.generate(name, req.user._id, allowedBounties);
    doc.notes = notes;
    const record = await PartnerApiKey.create(doc);

    res.json({
      success: true,
      data: {
        id:        record._id,
        name:      record.name,
        keyPrefix: record.keyPrefix,
        rawKey,    // shown ONCE — store it securely
        createdAt: record.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke a partner API key
router.post('/api/partner-keys/:keyId/revoke', isAdmin, async (req, res) => {
  try {
    const key = await PartnerApiKey.findByIdAndUpdate(
      req.params.keyId,
      { isActive: false },
      { new: true }
    );
    if (!key) return res.status(404).json({ success: false, error: 'Key not found' });
    res.json({ success: true, data: { id: key._id, isActive: key.isActive } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List sponsored submissions for a bounty
router.get('/api/bounties/:id/sponsored-submissions', isAdmin, async (req, res) => {
  try {
    const submissions = await SponsoredBountySubmission.find({ bountyId: req.params.id })
      .populate('partnerKeyId', 'name keyPrefix')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// LEGACY DASHBOARD PAGE (kept for backward compat)
// ══════════════════════════════════════════════════════
router.get('/legacy',        isAdmin, adminController.getAdminDashboard);

// ==================== STATISTICS ====================

// Get overall statistics
router.get("/api/statistics", isAdmin, adminController.getStatistics);

// ==================== USERS ====================

// IMPORTANT: Put /count and /export BEFORE /:userId to avoid route conflicts
router.get("/api/users/count", isAdmin, adminController.getUserCount);
router.get("/api/users/export", isAdmin, adminController.exportUsers);
router.get("/api/users", isAdmin, adminController.getAllUsers);
router.get("/api/users/:userId", isAdmin, adminController.getUserDetails);
router.put("/api/users/:userId", isAdmin, adminController.updateUser);
router.delete("/api/users/:userId", isAdmin, adminController.deleteUser);
router.post("/api/users/:userId/login-as", isAdmin, adminController.loginAsUser);

// ==================== QUESTS ====================

// IMPORTANT: Put /stats BEFORE /:questId
router.get("/api/quests/stats", isAdmin, adminController.getQuestStats);
router.get("/api/quests", isAdmin, adminController.getAllQuests);
router.post("/api/quests", isAdmin, adminController.createQuest);

// Quest-specific routes
router.get("/api/quests/:questId", isAdmin, adminController.getQuestById);
router.post("/api/quests/:questId/daily-task", isAdmin, adminController.addDailyTask);
router.delete("/api/quests/:questId/daily-task/:taskId", isAdmin, adminController.removeDailyTask);
router.get("/api/quests/:questId/leaderboard", isAdmin, adminController.getQuestLeaderboardAdmin);
router.patch("/api/quests/:questId/settings", isAdmin, adminController.updateQuestSettings);
router.get("/api/quests/:questId/export", isAdmin, adminController.exportQuestLeaderboard);
router.get("/api/quests/:questId/export-tasks", isAdmin, adminController.exportTaskCompletions);
// Referral Audit Routes
router.get("/api/quests/:questId/referral-audit", isAdmin, adminController.getQuestReferralAudit);
router.get("/api/quests/:questId/users/:userId/referrals", isAdmin, adminController.getUserReferralDetails);
router.patch("/api/quests/:questId/toggle", isAdmin, adminController.toggleQuestStatus);
router.delete("/api/quests/:questId", isAdmin, adminController.deleteQuest);

// ==================== EVENTS ====================

// IMPORTANT: Put /stats BEFORE /:eventId
router.get("/api/events/stats", isAdmin, adminController.getEventStats);
router.get("/api/events", isAdmin, adminController.getAllEvents);
router.post("/api/events", isAdmin, adminController.createEvent);
router.get("/api/events/:eventId", isAdmin, adminController.getEventById);
router.put("/api/events/:eventId", isAdmin, adminController.updateEvent);
router.delete("/api/events/:eventId", isAdmin, adminController.deleteEvent);
router.get("/api/events/:eventId/registrations", isAdmin, adminController.getEventRegistrations);

// ==================== APPLICATIONS ====================

// IMPORTANT: Put /stats and /export BEFORE /:applicationId
router.get("/api/applications/stats", isAdmin, adminController.getApplicationStats);
router.get("/api/applications/export", isAdmin, adminController.exportApplications);
router.get("/api/applications", isAdmin, adminController.getAllApplications);
router.get("/api/applications/:applicationId", isAdmin, adminController.getApplicationDetails);
router.post("/api/applications/:applicationId/approve", isAdmin, adminController.approveApplication);
router.post("/api/applications/:applicationId/reject", isAdmin, adminController.rejectApplication);

// ══════════════════════════════════════════════════════
// BUSINESS DEVELOPER & BUSINESS MANAGEMENT
// ══════════════════════════════════════════════════════

const BusinessDeveloper  = require('../models/BusinessDeveloper');
const Business           = require('../models/Business');
const BusinessFundRequest= require('../models/BusinessFundRequest');
const BusinessTransaction= require('../models/BusinessTransaction');
const BDEarning          = require('../models/BDEarning');
const CommissionSettings = require('../models/CommissionSettings');
const WalletAddress      = require('../models/WalletAddress');

// ── BD pages ──────────────────────────────────────────

router.get('/business-developers', isAdminPage, async (req, res) => {
  try {
    const statusFilter = req.query.status && req.query.status !== 'all' ? req.query.status : null;
    const query = statusFilter ? { status: statusFilter } : {};
    const bds = await BusinessDeveloper.find(query).sort({ createdAt: -1 });

    const counts = {};
    const all = await BusinessDeveloper.find();
    counts.all = all.length;
    ['pending','approved','rejected','suspended'].forEach(s => {
      counts[s] = all.filter(b => b.status === s).length;
    });

    res.render('admin/pages/business-developers', {
      user: req.user, bds, counts, activeStatus: req.query.status || 'all'
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/business-developers/:id/approve', isAdminPage, async (req, res) => {
  try {
    await BusinessDeveloper.findByIdAndUpdate(req.params.id, {
      status: 'approved', approvedAt: new Date(), approvedBy: req.user._id
    });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/business-developers/:id/reject', isAdminPage, async (req, res) => {
  try {
    await BusinessDeveloper.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectionReason: req.body.reason || ''
    });
    res.redirect('/admin/business-developers');
  } catch (err) { res.redirect('/admin/business-developers'); }
});

router.post('/business-developers/:id/suspend', isAdminPage, async (req, res) => {
  try {
    await BusinessDeveloper.findByIdAndUpdate(req.params.id, { status: 'suspended' });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/business-developers/:id/commission', isAdminPage, async (req, res) => {
  try {
    const rate = req.body.commissionRate !== '' && req.body.commissionRate !== undefined
      ? parseFloat(req.body.commissionRate)
      : null;
    await BusinessDeveloper.findByIdAndUpdate(req.params.id, { commissionRate: rate });
    res.redirect('/admin/business-developers');
  } catch (err) { res.redirect('/admin/business-developers'); }
});

router.post('/business-developers/:id/delete', isAdminPage, async (req, res) => {
  try {
    await BusinessDeveloper.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/business-developers/:id/login-as', isAdminPage, async (req, res) => {
  try {
    const bd = await BusinessDeveloper.findById(req.params.id);
    if (!bd) return res.json({ success: false, message: 'BD not found' });
    req.session.bdId   = bd._id.toString();
    req.session.bdName = bd.name;
    res.json({ success: true, redirect: '/business-developers/dashboard' });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/business-developers/:id/mark-paid', isAdminPage, async (req, res) => {
  try {
    const bd = await BusinessDeveloper.findById(req.params.id);
    if (!bd) return res.json({ success: false, message: 'BD not found' });
    const amount = bd.pendingEarnings;
    bd.paidEarnings   += amount;
    bd.pendingEarnings = 0;
    await bd.save();
    await BDEarning.updateMany({ bdId: bd._id, status: 'pending' }, { status: 'paid', paidAt: new Date() });
    res.json({ success: true, amount });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

// ── Business pages ────────────────────────────────────

router.get('/businesses', isAdminPage, async (req, res) => {
  try {
    const statusFilter = req.query.status && req.query.status !== 'all' ? req.query.status : null;
    const query = statusFilter ? { status: statusFilter } : {};
    const businesses = await Business.find(query).populate('createdBy', 'name email').sort({ createdAt: -1 });

    const all = await Business.find();
    const counts = { all: all.length };
    ['pending','approved','rejected','suspended'].forEach(s => {
      counts[s] = all.filter(b => b.status === s).length;
    });

    res.render('admin/pages/businesses', {
      user: req.user, businesses, counts, activeStatus: req.query.status || 'all'
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/businesses/:id/approve', isAdminPage, async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.params.id, {
      status: 'approved', approvedAt: new Date(), approvedBy: req.user._id
    });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/businesses/:id/reject', isAdminPage, async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectionReason: req.body.reason || ''
    });
    res.redirect('/admin/businesses');
  } catch (err) { res.redirect('/admin/businesses'); }
});

router.post('/businesses/:id/suspend', isAdminPage, async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.params.id, { status: 'suspended' });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/businesses/:id/delete', isAdminPage, async (req, res) => {
  try {
    const biz = await Business.findById(req.params.id);
    if (!biz) return res.json({ success: false, message: 'Business not found' });

    // Reverse BD commission earnings tied to this business
    const bdEarnings = await BDEarning.find({ businessId: biz._id });
    if (bdEarnings.length && biz.createdBy) {
      const totalPending  = bdEarnings.reduce((s, e) => s + (e.commissionAmount || 0), 0);
      const BusinessDeveloper = require('../models/BusinessDeveloper');
      await BusinessDeveloper.findByIdAndUpdate(biz.createdBy, {
        $inc: { pendingEarnings: -totalPending, totalEarned: -totalPending }
      });
    }

    // Delete all related records
    await Promise.all([
      BDEarning.deleteMany({ businessId: biz._id }),
      BusinessTransaction.deleteMany({ businessId: biz._id }),
      BusinessFundRequest.deleteMany({ businessId: biz._id })
    ]);

    await Business.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete business error:', err);
    res.json({ success: false, message: err.message });
  }
});

router.post('/businesses/:id/login-as', isAdminPage, async (req, res) => {
  try {
    const biz = await Business.findById(req.params.id);
    if (!biz) return res.json({ success: false, message: 'Business not found' });
    req.session.businessId   = biz._id.toString();
    req.session.businessName = biz.name;
    res.json({ success: true, redirect: '/business/dashboard' });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

// ── Fund requests ─────────────────────────────────────

router.get('/fund-requests', isAdminPage, async (req, res) => {
  try {
    const statusFilter = req.query.status && req.query.status !== 'all' ? req.query.status : null;
    const query = statusFilter ? { status: statusFilter } : {};
    const requests = await BusinessFundRequest.find(query)
      .populate('businessId', 'name username')
      .sort({ createdAt: -1 });

    const all = await BusinessFundRequest.find();
    const counts = { all: all.length };
    ['pending','approved','rejected'].forEach(s => {
      counts[s] = all.filter(r => r.status === s).length;
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const approvedThisMonth = all.filter(r => r.status === 'approved' && new Date(r.createdAt) >= monthStart);
    const totalApprovedThisMonth = approvedThisMonth.reduce((s, r) => s + r.amount, 0);
    const totalApproved = all.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0);

    res.render('admin/pages/fund-requests', {
      user: req.user, requests, counts,
      activeStatus: req.query.status || 'all',
      totalApprovedThisMonth, totalApproved
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/fund-requests/:id/approve', isAdminPage, async (req, res) => {
  try {
    const fr = await BusinessFundRequest.findById(req.params.id);
    if (!fr || fr.status !== 'pending') return res.json({ success: false, message: 'Request not found or already processed.' });

    fr.status     = 'approved';
    fr.approvedAt = new Date();
    fr.approvedBy = req.user._id;
    await fr.save();

    const business = await Business.findById(fr.businessId);
    if (business) {
      const balanceBefore = business.balance;
      business.balance     += fr.amount;
      business.totalFunded += fr.amount;
      await business.save();

      await BusinessTransaction.create({
        businessId:    business._id,
        type:          'fund',
        totalAmount:   fr.amount,
        poolAmount:    fr.amount,
        description:   'Account funding approved',
        balanceBefore,
        balanceAfter: business.balance
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

router.post('/fund-requests/:id/reject', isAdminPage, async (req, res) => {
  try {
    await BusinessFundRequest.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectionReason: req.body.reason || ''
    });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

// ── Wallet addresses ──────────────────────────────────

router.get('/wallet-addresses', isAdminPage, async (req, res) => {
  try {
    const wallets = await WalletAddress.find().populate('addedBy', 'username').sort({ token: 1, network: 1 });
    res.render('admin/pages/wallet-addresses', { user: req.user, wallets });
  } catch (err) { res.redirect('/admin'); }
});

router.post('/wallet-addresses/add', isAdminPage, async (req, res) => {
  try {
    const { token, network, address, label } = req.body;
    await WalletAddress.create({ token, network, address, label, addedBy: req.user._id });
    res.redirect('/admin/wallet-addresses?success=added');
  } catch (err) { res.redirect('/admin/wallet-addresses?error=' + encodeURIComponent(err.message)); }
});

router.post('/wallet-addresses/:id/toggle', isAdminPage, async (req, res) => {
  try {
    const w = await WalletAddress.findById(req.params.id);
    if (!w) return res.json({ success: false });
    w.isActive = !w.isActive;
    await w.save();
    res.json({ success: true, isActive: w.isActive });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

router.post('/wallet-addresses/:id/delete', isAdminPage, async (req, res) => {
  try {
    await WalletAddress.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.json({ success: false, message: err.message }); }
});

// ── Commission settings ───────────────────────────────

router.get('/commission-settings', isAdminPage, async (req, res) => {
  try {
    const settings = await CommissionSettings.getCurrent();
    res.render('admin/pages/commission-settings', {
      user: req.user, settings,
      saved: req.query.saved === '1'
    });
  } catch (err) {
    res.redirect('/admin');
  }
});

router.post('/commission-settings', isAdminPage, async (req, res) => {
  try {
    const { bdCommissionRate, platformCommissionRate } = req.body;
    await CommissionSettings.create({
      bdCommissionRate:       parseFloat(bdCommissionRate),
      platformCommissionRate: parseFloat(platformCommissionRate),
      updatedBy: req.user._id
    });
    res.redirect('/admin/commission-settings?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/commission-settings');
  }
});

// ══════════════════════════════════════════════════════════
// LAUNCH REWARDS
// ══════════════════════════════════════════════════════════
const LaunchReward = require('../models/LaunchReward');
const { getTreasuryBalance } = require('../utils/sendUsdc');

router.get('/launch-rewards', isAdmin, async (req, res) => {
  try {
    const all = await LaunchReward.find({}).sort({ amount: -1, xp: -1 }).lean();
    const balance = await getTreasuryBalance();
    const stats = {
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      sent: all.filter(r => r.status === 'sent').length,
      failed: all.filter(r => r.status === 'failed').length,
      skipped: all.filter(r => r.status === 'skipped_no_wallet').length,
      totalOwed: all.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
      totalSent: all.filter(r => r.status === 'sent').reduce((s, r) => s + r.amount, 0),
    };
    res.render('admin/launch-rewards', { rewards: all, stats, balance });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading rewards');
  }
});

router.post('/api/launch-rewards/seed', isAdmin, async (req, res) => {
  try {
    const { execFile } = require('child_process');
    const path = require('path');
    const script = path.join(__dirname, '../scripts/seed-launch-rewards.js');
    execFile('node', [script], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) return res.json({ ok: false, error: err.message, stderr });
      res.json({ ok: true, output: stdout });
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

let _distributing = false;
router.post('/api/launch-rewards/distribute', isAdmin, async (req, res) => {
  if (_distributing) return res.json({ ok: false, error: 'Distribution already running' });
  _distributing = true;
  res.json({ ok: true, message: 'Distribution started — refresh the page to see progress' });

  const { sendUsdc } = require('../utils/sendUsdc');
  const pending = await LaunchReward.find({ status: 'pending' }).sort({ amount: -1 }).lean();
  let sent = 0, failed = 0;

  for (const reward of pending) {
    if (!reward.walletAddress) {
      await LaunchReward.updateOne({ _id: reward._id }, { $set: { status: 'skipped_no_wallet' } });
      continue;
    }
    try {
      const sig = await sendUsdc(reward.walletAddress, reward.amount);
      await LaunchReward.updateOne({ _id: reward._id }, { $set: { status: 'sent', txSignature: sig, sentAt: new Date() } });
      sent++;
      console.log(`[Rewards] Sent $${reward.amount} → @${reward.username} | TX: ${sig}`);
    } catch (err) {
      await LaunchReward.updateOne({ _id: reward._id }, { $set: { status: 'failed', failReason: err.message } });
      failed++;
      console.error(`[Rewards] FAILED @${reward.username}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`[Rewards] Done — sent:${sent} failed:${failed}`);
  _distributing = false;
});

router.get('/api/launch-rewards/status', isAdmin, async (req, res) => {
  try {
    const all = await LaunchReward.find({}).lean();
    res.json({
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      sent: all.filter(r => r.status === 'sent').length,
      failed: all.filter(r => r.status === 'failed').length,
      skipped: all.filter(r => r.status === 'skipped_no_wallet').length,
      totalSent: all.filter(r => r.status === 'sent').reduce((s, r) => s + r.amount, 0),
      distributing: _distributing
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/launch-rewards/retry-failed', isAdmin, async (req, res) => {
  try {
    const result = await LaunchReward.updateMany({ status: 'failed' }, { $set: { status: 'pending', failReason: null, txSignature: null } });
    res.json({ ok: true, reset: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
router.get('/api/quests/:questId/winners', isAdmin, adminController.getQuestWinners);
router.post('/api/quests/distribute-rewards', isAdmin, adminController.distributeQuestRewards);
router.get('/api/withdrawals', isAdmin, adminController.getAllWithdrawals);
router.get('/api/withdrawals/stats', isAdmin, adminController.getWithdrawalStats);
router.post('/api/withdrawals/:transactionId/approve', isAdmin, adminController.approveWithdrawal);
router.post('/api/withdrawals/:transactionId/reject', isAdmin, adminController.rejectWithdrawal);

// Add these routes if they don't exist
router.get('/api/quests/:questId/leaderboard', isAdmin, adminController.getQuestLeaderboardAdmin);
router.get('/api/quests/:questId/export', isAdmin, adminController.exportQuestLeaderboard);
// IMPORTANT: Put /stats and /export BEFORE /:applicationId
router.get("/api/ambassadors/stats", isAdmin, adminController.getAmbassadorStats);
router.get("/api/ambassadors/export", isAdmin, adminController.exportAmbassadorApplications);
router.get("/api/ambassadors", isAdmin, adminController.getAllAmbassadorApplications);
router.get("/api/ambassadors/:applicationId", isAdmin, adminController.getAmbassadorDetails);
router.post("/api/ambassadors/:applicationId/approve", isAdmin, adminController.approveAmbassadorApplication);
router.post("/api/ambassadors/:applicationId/reject", isAdmin, adminController.rejectAmbassadorApplication);
router.put("/api/ambassadors/:applicationId/metrics", isAdmin, adminController.updateAmbassadorMetrics);

// Add these routes to your admin routes file (after the existing routes)

// ==================== USER BANNING ====================
router.get("/api/users/:userId/quest-progress", isAdmin, adminController.getUserWithQuestProgress);
router.post("/api/users/:userId/ban", isAdmin, adminController.banUserFromQuests);
router.post("/api/users/:userId/unban", isAdmin, adminController.unbanUser);
router.get("/api/banned-users", isAdmin, adminController.getBannedUsers);

// ==================== PROJECT SUBMISSIONS MANAGEMENT ====================

const ProjectSubmission = require('../models/ProjectSubmission');

router.get("/api/projects/submissions", isAdmin, async (req, res) => {
    try {
        const { status, category, page = 1, limit = 50 } = req.query;

        const query = {};
        if (status && status !== 'all') query.status = status;
        if (category) query.category = category;

        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            ProjectSubmission.find(query)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('submittedBy', 'username email')
                .populate('reviewedBy', 'username'),
            ProjectSubmission.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: submissions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching project submissions:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching project submissions'
        });
    }
});

router.put("/api/projects/submissions/:id/review", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        const submission = await ProjectSubmission.findByIdAndUpdate(
            id,
            {
                status,
                reviewNotes: reviewNotes || undefined,
                reviewedBy: req.user._id,
                reviewedAt: new Date()
            },
            { new: true }
        );

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Project submission not found'
            });
        }

        res.json({
            success: true,
            message: `Project ${status} successfully`,
            data: submission
        });

    } catch (error) {
        console.error('Error reviewing project submission:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while reviewing the submission'
        });
    }
});

// ==================== ROLE SETTINGS ====================

router.get('/settings/roles', isAdmin, (req, res) => {
  const { ROLES } = require('../config/gamification');
  res.render('admin/role-settings', {
    title: 'Role Settings - Admin',
    user: req.user,
    roles: ROLES
  });
});

// ==================== SITE SETTINGS ====================

router.get('/api/settings', isAdmin, async (req, res) => {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const settings = await SiteSettings.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/api/settings/email-provider', isAdmin, async (req, res) => {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const { provider } = req.body;
    if (!['resend', 'gmail'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Invalid provider. Use resend or gmail.' });
    }
    const settings = await SiteSettings.getSettings();
    settings.emailProvider = provider;
    await settings.save();
    console.log(`Admin switched email provider → ${provider}`);
    res.json({ success: true, emailProvider: settings.emailProvider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/api/settings/email-verification', isAdmin, async (req, res) => {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const { required } = req.body;
    const settings = await SiteSettings.getSettings();
    settings.emailVerificationRequired = !!required;
    await settings.save();
    console.log(`Admin toggled emailVerificationRequired → ${settings.emailVerificationRequired}`);
    res.json({ success: true, emailVerificationRequired: settings.emailVerificationRequired });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/api/settings/test-email', isAdmin, async (req, res) => {
  try {
    const { sendEmail } = require('../utils/emailService');
    const to = req.user.email;
    const result = await sendEmail({
      to,
      subject: 'ONBOARD3 — Email Delivery Test',
      html: `<div style="font-family:Arial,sans-serif;background:#fff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #eee">
        <h2 style="color:#111;margin-bottom:8px">&#x2705; Email Delivery Test</h2>
        <p style="color:#444">This test email was sent from the ONBOARD3 admin panel.<br>If you are reading this, email delivery is working correctly.</p>
        <p style="color:#888;font-size:13px;margin-top:24px">Sent at: ${new Date().toISOString()}</p>
      </div>`
    });
    res.json({ success: result.success, sentTo: to, error: result.error || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/api/update-roles', isAdmin, async (req, res) => {
  try {
    const { roles } = req.body;
    const fs = require('fs');
    const path = require('path');
    if (!roles) return res.json({ success: false, message: 'No role data provided' });

    const configPath = path.join(__dirname, '../config/gamification.js');
    let configContent = fs.readFileSync(configPath, 'utf8');

    Object.keys(roles).forEach(roleKey => {
      const roleConfig = roles[roleKey];
      configContent = configContent.replace(new RegExp(`(${roleKey}:\\s*{[\\s\\S]*?minXP:\\s*)\\d+`, 'm'), `$1${roleConfig.minXP}`);
      configContent = configContent.replace(new RegExp(`(${roleKey}:[\\s\\S]*?monthlyBonus:\\s*)\\d+`, 'm'), `$1${roleConfig.benefits.monthlyBonus}`);
      configContent = configContent.replace(new RegExp(`(${roleKey}:[\\s\\S]*?classDiscount:\\s*)\\d+`, 'm'), `$1${roleConfig.benefits.classDiscount}`);
    });

    fs.writeFileSync(configPath, configContent, 'utf8');
    delete require.cache[require.resolve('../config/gamification')];
    res.json({ success: true, message: 'Role configuration updated successfully' });
  } catch (error) {
    console.error('Error updating roles:', error);
    res.json({ success: false, message: 'Error updating configuration' });
  }
});

// ==================== LEADERBOARD MANAGER ====================

router.get('/leaderboard', isAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const Quest = require('../models/Quest');
    const quests = await Quest.find({ isActive: true }).select('title _id').sort({ createdAt: -1 });
    res.render('admin/leaderboard-manager', { title: 'Leaderboard Manager', user: req.user, admin: req.user, quests: quests });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    res.status(500).send('Server error');
  }
});

// Get leaderboard data (global XP or quest-specific)
router.get('/api/leaderboard/data', isAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const User = require('../models/User');
    const UserQuestProgress = require('../models/UserQuestProgress');

    if (type === 'global' || !type) {
      // Global XP leaderboard
      const users = await User.find({}).sort({ xp: -1 }).limit(100).select('username xp isFakeUser');
      const data = users.map(u => ({
        _id: u._id,
        username: u.username,
        points: u.xp || 0,
        isFakeUser: u.isFakeUser || false
      }));
      return res.json({ success: true, data });
    } else {
      // Quest-specific leaderboard
      const progress = await UserQuestProgress.find({ questId: type, status: 'completed' })
        .populate('userId', 'username isFakeUser')
        .sort({ 'xpBreakdown.totalXp': -1 })
        .limit(100);

      const data = progress.map(p => ({
        _id: p.userId?._id,
        progressId: p._id,
        username: p.userId?.username || 'Unknown',
        points: p.xpBreakdown?.totalXp || 0,
        isFakeUser: p.userId?.isFakeUser || false,
        completedAt: p.completedAt
      }));
      return res.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.json({ success: false, message: 'Error fetching leaderboard data' });
  }
});

router.post('/api/leaderboard/add', isAdmin, async (req, res) => {
  try {
    const { username, points, isFakeUser, leaderboardType } = req.body;
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');

    if (leaderboardType === 'global' || !leaderboardType) {
      // Add user to global leaderboard
      const existing = await User.findOne({ username });
      if (existing) return res.json({ success: false, message: 'Username already exists' });
      const fakeUser = new User({
        username,
        email: username.toLowerCase().replace(/\s+/g, '_') + '@fake.onboard3.local',
        password: await bcrypt.hash(Math.random().toString(36), 10),
        xp: points || 0,
        isFakeUser: isFakeUser || false,
        isVerified: true
      });
      await fakeUser.save();
      res.json({ success: true, message: 'User added to leaderboard' });
    } else {
      // Add user to quest leaderboard
      const UserQuestProgress = require('../models/UserQuestProgress');
      const Quest = require('../models/Quest');

      // Find or create fake user
      let user = await User.findOne({ username });
      if (!user) {
        user = new User({
          username,
          email: username.toLowerCase().replace(/\s+/g, '_') + '@fake.onboard3.local',
          password: await bcrypt.hash(Math.random().toString(36), 10),
          xp: 0,
          isFakeUser: true,
          isVerified: true
        });
        await user.save();
      }

      // Check if progress already exists
      let progress = await UserQuestProgress.findOne({ userId: user._id, questId: leaderboardType });
      if (progress) {
        return res.json({ success: false, message: 'User already in this quest leaderboard' });
      }

      const quest = await Quest.findById(leaderboardType);
      if (!quest) return res.json({ success: false, message: 'Quest not found' });

      // Create quest progress
      progress = new UserQuestProgress({
        userId: user._id,
        questId: leaderboardType,
        status: 'completed',
        progress: 100,
        tasksCompleted: quest.tasks?.length || 1,
        totalTasks: quest.tasks?.length || 1,
        completedAt: new Date(),
        xpBreakdown: {
          totalXp: points || 0,
          baseXp: points || 0
        }
      });
      await progress.save();
      res.json({ success: true, message: 'User added to quest leaderboard' });
    }
  } catch (error) {
    console.error('Error adding user:', error);
    res.json({ success: false, message: 'Error adding user: ' + error.message });
  }
});

router.post('/api/leaderboard/update/:userId', isAdmin, async (req, res) => {
  try {
    const { username, points, isFakeUser, leaderboardType } = req.body;
    const User = require('../models/User');

    if (leaderboardType === 'global' || !leaderboardType) {
      // Update global XP
      const user = await User.findById(req.params.userId);
      if (!user) return res.json({ success: false, message: 'User not found' });
      if (username) user.username = username;
      if (points !== undefined) user.xp = points;
      if (isFakeUser !== undefined) user.isFakeUser = isFakeUser;
      await user.save();
      res.json({ success: true, message: 'User updated successfully' });
    } else {
      // Update quest progress XP
      const UserQuestProgress = require('../models/UserQuestProgress');
      const progress = await UserQuestProgress.findOne({ userId: req.params.userId, questId: leaderboardType });
      if (!progress) return res.json({ success: false, message: 'Quest progress not found' });

      if (points !== undefined) {
        progress.xpBreakdown.totalXp = points;
        progress.xpBreakdown.baseXp = points;
      }
      await progress.save();
      res.json({ success: true, message: 'Quest progress updated successfully' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.json({ success: false, message: 'Error updating user' });
  }
});

router.post('/api/leaderboard/delete/:userId', isAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const User = require('../models/User');

    if (type === 'global' || !type) {
      const user = await User.findById(req.params.userId);
      if (!user) return res.json({ success: false, message: 'User not found' });
      if (!user.isFakeUser) return res.json({ success: false, message: 'Cannot delete real users' });
      await User.findByIdAndDelete(req.params.userId);
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      // Delete quest progress entry
      const UserQuestProgress = require('../models/UserQuestProgress');
      const progress = await UserQuestProgress.findOne({ userId: req.params.userId, questId: type });
      if (!progress) return res.json({ success: false, message: 'Quest progress not found' });
      await UserQuestProgress.findByIdAndDelete(progress._id);
      res.json({ success: true, message: 'Quest leaderboard entry deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.json({ success: false, message: 'Error deleting user' });
  }
});

// ==================== PARTNER MANAGEMENT ====================

const Partner = require('../models/Partner');

// Partner management page
router.get('/partners', isAdmin, async (req, res) => {
  try {
    res.render('admin/partners', { title: 'Partner Management', user: req.user, admin: req.user });
  } catch (error) {
    console.error('Error loading partners page:', error);
    res.status(500).send('Server error');
  }
});

// Get partner stats
router.get('/api/partners/stats', isAdmin, async (req, res) => {
  try {
    const totalPartners = await Partner.countDocuments({ applicationStatus: 'approved' });
    const pendingApplications = await Partner.countDocuments({ applicationStatus: 'pending' });

    // Count pending proposals across all partners
    const partnersWithProposals = await Partner.find({ 'proposals.status': 'pending' });
    let pendingProposals = 0;
    partnersWithProposals.forEach(p => {
      pendingProposals += p.proposals.filter(prop => prop.status === 'pending').length;
    });

    // Total commission paid
    const commissionAgg = await Partner.aggregate([
      { $match: { applicationStatus: 'approved' } },
      { $group: { _id: null, total: { $sum: '$totalCommissionEarned' } } }
    ]);
    const totalCommission = commissionAgg[0]?.total || 0;

    res.json({
      success: true,
      stats: { totalPartners, pendingApplications, pendingProposals, totalCommission }
    });
  } catch (error) {
    console.error('Error getting partner stats:', error);
    res.json({ success: false, message: 'Error getting stats' });
  }
});

// Get partners list
router.get('/api/partners', isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { applicationStatus: status } : {};

    const partners = await Partner.find(query)
      .populate('userId', 'username email xp')
      .sort({ appliedAt: -1 });

    res.json({ success: true, data: partners });
  } catch (error) {
    console.error('Error getting partners:', error);
    res.json({ success: false, message: 'Error getting partners' });
  }
});

// Get all proposals
router.get('/api/partners/proposals', isAdmin, async (req, res) => {
  try {
    const partners = await Partner.find({ 'proposals.0': { $exists: true } })
      .populate('userId', 'username');

    const proposals = [];
    partners.forEach(p => {
      p.proposals.forEach(proposal => {
        proposals.push({
          partnerId: p._id,
          proposalId: proposal._id,
          partnerName: p.fullName,
          partnerUsername: p.userId?.username,
          ...proposal.toObject()
        });
      });
    });

    // Sort by submitted date, newest first
    proposals.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json({ success: true, data: proposals });
  } catch (error) {
    console.error('Error getting proposals:', error);
    res.json({ success: false, message: 'Error getting proposals' });
  }
});

// Get single partner details
router.get('/api/partners/:id', isAdmin, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
      .populate('userId', 'username email xp');

    if (!partner) {
      return res.json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, data: partner });
  } catch (error) {
    console.error('Error getting partner:', error);
    res.json({ success: false, message: 'Error getting partner' });
  }
});

// Get single proposal
router.get('/api/partners/:partnerId/proposals/:proposalId', isAdmin, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.partnerId);
    if (!partner) {
      return res.json({ success: false, message: 'Partner not found' });
    }

    const proposal = partner.proposals.id(req.params.proposalId);
    if (!proposal) {
      return res.json({ success: false, message: 'Proposal not found' });
    }

    res.json({ success: true, data: proposal });
  } catch (error) {
    console.error('Error getting proposal:', error);
    res.json({ success: false, message: 'Error getting proposal' });
  }
});

// Approve partner application
router.post('/api/partners/:id/approve', isAdmin, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return res.json({ success: false, message: 'Partner not found' });
    }

    partner.applicationStatus = 'approved';
    partner.approvedAt = new Date();
    partner.approvedBy = req.user._id;
    await partner.save();

    res.json({ success: true, message: 'Application approved' });
  } catch (error) {
    console.error('Error approving application:', error);
    res.json({ success: false, message: 'Error approving application' });
  }
});

// Reject partner application
router.post('/api/partners/:id/reject', isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return res.json({ success: false, message: 'Partner not found' });
    }

    partner.applicationStatus = 'rejected';
    partner.rejectedAt = new Date();
    partner.rejectedBy = req.user._id;
    partner.rejectionReason = reason || '';
    await partner.save();

    res.json({ success: true, message: 'Application rejected' });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.json({ success: false, message: 'Error rejecting application' });
  }
});

// Approve proposal
router.post('/api/partners/:partnerId/proposals/:proposalId/approve', isAdmin, async (req, res) => {
  try {
    const { commission } = req.body;
    const partner = await Partner.findById(req.params.partnerId)
      .populate('userId', 'telegramId');

    if (!partner) {
      return res.json({ success: false, message: 'Partner not found' });
    }

    const proposal = partner.proposals.id(req.params.proposalId);
    if (!proposal) {
      return res.json({ success: false, message: 'Proposal not found' });
    }

    proposal.status = 'approved';
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;
    proposal.commissionPaid = commission || 0;

    partner.approvedProposals = (partner.approvedProposals || 0) + 1;
    partner.totalCommissionEarned = (partner.totalCommissionEarned || 0) + (commission || 0);

    await partner.save();

    res.json({ success: true, message: 'Proposal approved' });
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.json({ success: false, message: 'Error approving proposal' });
  }
});

// Reject proposal
router.post('/api/partners/:partnerId/proposals/:proposalId/reject', isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const partner = await Partner.findById(req.params.partnerId);

    if (!partner) {
      return res.json({ success: false, message: 'Partner not found' });
    }

    const proposal = partner.proposals.id(req.params.proposalId);
    if (!proposal) {
      return res.json({ success: false, message: 'Proposal not found' });
    }

    proposal.status = 'rejected';
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;
    proposal.reviewNotes = reason || '';

    await partner.save();

    res.json({ success: true, message: 'Proposal rejected' });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    res.json({ success: false, message: 'Error rejecting proposal' });
  }
});

// ── Quest Applications ────────────────────────────────
router.get('/quest-applications', isAdminPage, async (req, res) => {
  try {
    const applications = await QuestApplication.find()
      .populate('questId', 'title')
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    // Group by quest
    const grouped = {};
    applications.forEach(a => {
      const qid = a.questId ? a.questId._id.toString() : 'unknown';
      if (!grouped[qid]) {
        grouped[qid] = { quest: a.questId, items: [] };
      }
      grouped[qid].items.push(a);
    });

    res.render('admin/pages/quest-applications', {
      user: req.user,
      applications,
      grouped: Object.values(grouped)
    });
  } catch (err) {
    console.error('[admin quest-applications]', err);
    res.status(500).send('Error: ' + err.message);
  }
});

router.post('/quest-applications/:id/approve', isAdminPage, async (req, res) => {
  try {
    const Quest             = require('../models/Quest');
    const UserQuestProgress = require('../models/UserQuestProgress');

    const application = await QuestApplication.findById(req.params.id);
    if (!application) return res.json({ success: false, message: 'Not found' });

    application.status     = 'approved';
    application.reviewedAt = new Date();
    application.reviewedBy = req.user._id;
    await application.save();

    // Create UserQuestProgress so user can participate
    const quest = await Quest.findById(application.questId);
    if (quest) {
      const existing = await UserQuestProgress.findOne({ questId: quest._id, userId: application.userId });
      if (!existing) {
        await UserQuestProgress.create({
          questId:    quest._id,
          userId:     application.userId,
          status:     'not_started',
          startedAt:  new Date(),
          totalTasks: quest.tasks ? quest.tasks.length : 0,
          taskProgress: []
        });
        // Increment participant count
        await Quest.findByIdAndUpdate(quest._id, { $inc: { totalParticipants: 1 } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[approve quest-application]', err);
    res.json({ success: false, message: err.message });
  }
});

router.post('/quest-applications/:id/reject', isAdminPage, async (req, res) => {
  try {
    const application = await QuestApplication.findById(req.params.id);
    if (!application) return res.json({ success: false, message: 'Not found' });

    application.status          = 'rejected';
    application.rejectionReason = (req.body.reason || '').trim();
    application.reviewedAt      = new Date();
    application.reviewedBy      = req.user._id;
    await application.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[reject quest-application]', err);
    res.json({ success: false, message: err.message });
  }
});

router.get('/quest-applications/:questId/leaderboard', isAdminPage, async (req, res) => {
  res.redirect('/admin/quests');
});

// ── Upload logo for a quest ──────────────────────────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const _questLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../public/img/quests');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, 'quest-' + req.params.questId + '-' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  }
});

router.post('/quests/:questId/upload-logo', isAdminPage, (req, res, next) => {
  _questLogoUpload.single('logo')(req, res, (err) => {
    if (err) return res.json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const Quest = require('../models/Quest');
    if (!req.file) return res.json({ success: false, message: 'No file uploaded' });
    const imgPath = '/img/quests/' + req.file.filename;
    await Quest.findByIdAndUpdate(req.params.questId, { image: imgPath });
    res.json({ success: true, image: imgPath });
  } catch (err) {
    console.error('[upload-logo]', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// ── Admin Support Chat ────────────────────────────────────────────────────────
const ChatConversation = require('../models/ChatConversation');

router.get('/support', isAdminPage, async (req, res) => {
  try {
    const conversations = await ChatConversation.find()
      .sort({ lastMessageAt: -1 })
      .populate('userId', 'username profilePicture')
      .lean();
    const User = require('../models/User');
    const user = await User.findById(req.session.userId).select('username').lean();
    res.render('admin/pages/support', { conversations, user });
  } catch (err) {
    console.error('[admin support]', err);
    res.redirect('/admin');
  }
});

router.post('/support/:id/reply', isAdminPage, async (req, res) => {
  try {
    const User = require('../models/User');
    const admin = await User.findById(req.session.userId).select('username').lean();
    const text = (req.body.message || '').trim().slice(0, 500);
    if (!text) return res.json({ success: false, message: 'Empty message' });
    const convo = await ChatConversation.findById(req.params.id);
    if (!convo) return res.json({ success: false, message: 'Not found' });
    convo.messages.push({ role: 'admin', content: text, adminName: admin ? admin.username : 'Admin' });
    convo.lastMessageAt = new Date();
    await convo.save();
    res.json({ success: true, adminName: admin ? admin.username : 'Admin' });
  } catch (err) {
    res.json({ success: false, message: 'Server error' });
  }
});

router.post('/support/:id/mark-read', isAdminPage, async (req, res) => {
  try {
    await ChatConversation.findByIdAndUpdate(req.params.id, { unreadByAdmin: 0 });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

router.post('/support/:id/resolve', isAdminPage, async (req, res) => {
  try {
    await ChatConversation.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// ── Stacks Wallets ─────────────────────────────────────────────────────────────
const stacksWallet = require('../utils/stacksWallet');


router.get('/stacks-wallets', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.status(403).send('Forbidden');
  try {
    const User = require('../models/User');
    const users = await User.find({ stacksWalletIndex: { $ne: null } })
      .sort({ stacksBalance: -1 })
      .select('username email stacksWalletIndex stacksAddress stacksBalance stacksBalanceUSD stacksCheckedAt usdcBalance')
      .lean();

    const stxPrice  = await stacksWallet.getSTXPrice();
    let feeWallet   = null;
    try { feeWallet = await stacksWallet.getFeeWalletInfo(); } catch (_) {}
    res.render('admin/pages/stacks-wallets', {
      user: req.user, users, stxPrice, feeWallet, page: 'stacks-wallets',
      hasSeed:       !!process.env.STACKS_MASTER_SEED,
      hasMainWallet: !!process.env.STACKS_MAIN_WALLET
    });
  } catch (err) {
    console.error('[stacks-wallets]', err);
    res.status(500).send('Error: ' + err.message);
  }
});

// Refresh balance for all users (or single if userId provided)
router.post('/stacks-wallets/refresh', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    const User   = require('../models/User');
    const { userId } = req.body;
    const query  = userId ? { _id: userId } : { stacksWalletIndex: { $ne: null } };
    const users  = await User.find(query).select('stacksWalletIndex stacksAddress').lean();

    const stxPrice = await stacksWallet.getSTXPrice();
    let updated = 0;

    for (const u of users) {
      if (u.stacksWalletIndex == null) continue;
      const microSTX = await stacksWallet.getBalance(u.stacksAddress);
      if (microSTX < 0) continue; // skip failed fetches
      const usd = Math.round((microSTX / 1_000_000) * stxPrice * 100) / 100;
      await User.findByIdAndUpdate(u._id, {
        stacksBalance:    microSTX,
        stacksBalanceUSD: usd,
        stacksCheckedAt:  new Date()
      });
      updated++;
    }

    res.json({ success: true, updated });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Sweep one user's wallet to main wallet
router.post('/stacks-wallets/sweep/:userId', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    const result = await stacksWallet.sweepWallet(req.params.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── Bulk Mail ──────────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');
const BulkMailJob = require('../models/BulkMailJob');

const GMAIL_ACCOUNTS = [
  { name: 'onboard3a', email: 'kwarablockchain@gmail.com',  password: 'jiqv ihyj xwfr sfif' },
  { name: 'onboard3b', email: 'mrjerrytv9@gmail.com',        password: 'mhwf vkxm jezc gjhf' },
  { name: 'onboard3c', email: 'onboardweb3ng@gmail.com',     password: 'vabc cryg qjhm yauw' },
  { name: 'onboard3d', email: 'cryptomoo123@gmail.com',      password: 'oosu axcs xzcr bjpf' },
  { name: 'onboard3e', email: 'replyfing@gmail.com',         password: 'tmje fjvi axko nzjp' },
];
const DAILY_LIMIT = 450;
const BATCH_SIZE  = 3;
const _tp = {};

function getTP(acct) {
  if (!_tp[acct.email]) {
    _tp[acct.email] = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: acct.email, pass: acct.password }
    });
  }
  return _tp[acct.email];
}

function buildBackEmailHtml(username) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

  <tr><td style="padding-bottom:24px;text-align:center">
    <span style="font-size:22px;font-weight:900;color:#5EC213;letter-spacing:3px">ONBOARD3</span>
  </td></tr>

  <tr><td style="background:#111;border:1px solid rgba(94,194,19,.18);border-radius:18px;padding:40px 32px">

    <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:900;line-height:1.25">
      ${username}, we are back.
    </h1>
    <p style="margin:0 0 24px 0;color:#5EC213;font-size:14px;font-weight:700">Bigger. Faster. Stronger.</p>

    <p style="margin:0 0 14px 0;color:#bbb;font-size:15px;line-height:1.75">
      It has been 4 months. We went quiet — but we were building something big. Now ONBOARD3 is back with a major upgrade and we are starting things off by giving something back to every member who stuck with us.
    </p>
    <p style="margin:0 0 28px 0;color:#bbb;font-size:15px;line-height:1.75">
      Your account is waiting. Your XP and progress are all still there.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr><td style="background:rgba(94,194,19,.07);border:1px solid rgba(94,194,19,.22);border-radius:12px;padding:24px">
      <p style="margin:0 0 4px 0;color:#5EC213;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase">Something waiting for you</p>
      <p style="margin:0 0 12px 0;color:#fff;font-size:22px;font-weight:900;line-height:1.2">A surprise on your dashboard — August 24</p>
      <p style="margin:0;color:#999;font-size:13px;line-height:1.6">Log in on August 24, complete your profile, and a special gift is already added to your account. No tasks. No forms. Just show up.</p>
    </td></tr>
    </table>

    <p style="margin:0 0 14px 0;color:#fff;font-size:15px;font-weight:800">How to get it:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;min-width:28px;background:#5EC213;border-radius:50%;text-align:center;vertical-align:middle">
            <span style="color:#000;font-size:13px;font-weight:900;line-height:28px">1</span>
          </td>
          <td style="padding-left:12px;color:#bbb;font-size:14px;line-height:1.6">
            Visit <strong style="color:#fff">onboard3.app</strong> on August 24
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;min-width:28px;background:#5EC213;border-radius:50%;text-align:center;vertical-align:middle">
            <span style="color:#000;font-size:13px;font-weight:900;line-height:28px">2</span>
          </td>
          <td style="padding-left:12px;color:#bbb;font-size:14px;line-height:1.6">
            Log in and <strong style="color:#fff">complete your profile</strong>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 0">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;min-width:28px;background:#5EC213;border-radius:50%;text-align:center;vertical-align:middle">
            <span style="color:#000;font-size:13px;font-weight:900;line-height:28px">3</span>
          </td>
          <td style="padding-left:12px;color:#bbb;font-size:14px;line-height:1.6">
            Your gift is <strong style="color:#fff">already on your dashboard</strong> — automatically added
          </td>
        </tr></table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:24px">
      <a href="https://onboard3.app" style="display:inline-block;background:#5EC213;color:#000;font-weight:900;font-size:15px;padding:15px 36px;border-radius:10px;text-decoration:none">
        Go to ONBOARD3 on August 24
      </a>
    </td></tr></table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
    <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:18px 20px">
      <p style="margin:0 0 6px 0;color:#fff;font-size:13px;font-weight:800">Excited? Share it.</p>
      <p style="margin:0;color:#888;font-size:13px;line-height:1.6">
        Screenshot this email, post on X and tag <strong style="color:#fff">@onboard3___</strong> to let everyone know we are back.
      </p>
    </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px">
      <a href="https://x.com/onboard3___" style="color:#aaa;font-size:13px;font-weight:700;text-decoration:none">Follow on X</a>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <a href="https://t.me/onboard_3" style="color:#229ED9;font-size:13px;font-weight:700;text-decoration:none">Join Telegram</a>
    </td></tr></table>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid rgba(255,255,255,.06);padding-top:16px">
      <p style="margin:0;color:#555;font-size:12px;text-align:center">August 24, 2026 &middot; ONBOARD3 Launch Day</p>
    </td></tr></table>

  </td></tr>

  <tr><td style="padding:20px 0 0 0;text-align:center">
    <p style="margin:0 0 4px 0;color:#444;font-size:12px">ONBOARD3 - Web3 Builder Hub &middot; Lagos, Nigeria</p>
    <p style="margin:0 0 4px 0;color:#333;font-size:11px">You signed up at onboard3.app &middot; <a href="mailto:onboardweb3ng@gmail.com?subject=unsubscribe" style="color:#333">Unsubscribe</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function buildBackEmailText(username) {
  return `${username}, we are back.

It has been 4 months. We went quiet but we were building something big. ONBOARD3 is back with a major upgrade and we are starting things off by giving something back to every member who stuck with us.

There is a surprise on your dashboard waiting for you on August 24.

HOW TO GET IT:
1. Visit onboard3.app on August 24
2. Log in and complete your profile
3. Your gift is already on your dashboard — no tasks, no forms, just show up

Go to ONBOARD3: https://onboard3.app

Excited? Screenshot this email, post on X and tag @onboard3___ to let everyone know we are back.

Follow on X: https://x.com/onboard3___
Join Telegram: https://t.me/onboard_3

August 24, 2026 - ONBOARD3 Launch Day
ONBOARD3 - Web3 Builder Hub - Lagos, Nigeria

You signed up at onboard3.app. To unsubscribe, reply with "unsubscribe" in the subject.`;
}

async function getOrCreateJob() {
  let job = await BulkMailJob.findOne();
  if (!job) {
    const User = require('../models/User');
    const total = await User.countDocuments({ isVerified: true, xp: { $gte: 1000 } });
    job = new BulkMailJob({
      totalRecipients: total,
      accountUsage: GMAIL_ACCOUNTS.map(a => ({ email: a.email, name: a.name, sentToday: 0, totalSent: 0, lastReset: new Date() }))
    });
    await job.save();
  }
  return job;
}

async function runTick(job) {
  const now = new Date();
  // Debounce — skip if a tick ran within last 2 seconds
  if (job.lastTickAt && (now - new Date(job.lastTickAt)) < 2000) return;
  job.lastTickAt = now;

  // Reset daily counters after 24h
  for (const u of job.accountUsage) {
    if ((now - new Date(u.lastReset)) >= 86400000) {
      u.sentToday = 0;
      u.lastReset = now;
    }
  }

  // Check if any account has capacity
  const hasCapacity = job.accountUsage.some(u => u.sentToday < DAILY_LIMIT);
  if (!hasCapacity) {
    await BulkMailJob.collection.updateOne({ _id: job._id }, { $set: { status: 'limit_reached', lastTickAt: now } });
    return;
  }

  // Get next batch
  const User = require('../models/User');
  const users = await User.find({ isVerified: true, xp: { $gte: 1000 } })
    .sort({ xp: -1, _id: 1 })
    .skip(job.currentIndex)
    .limit(BATCH_SIZE)
    .select('email username')
    .lean();

  if (!users.length) {
    await BulkMailJob.collection.updateOne({ _id: job._id }, { $set: { status: 'completed', completedAt: now, lastTickAt: now } });
    return;
  }

  // Round-robin starting account
  let acctPtr = job.sentCount % GMAIL_ACCOUNTS.length;

  for (const user of users) {
    // Find next available account
    let tries = 0;
    while (job.accountUsage[acctPtr].sentToday >= DAILY_LIMIT && tries < GMAIL_ACCOUNTS.length) {
      acctPtr = (acctPtr + 1) % GMAIL_ACCOUNTS.length;
      tries++;
    }
    if (tries === GMAIL_ACCOUNTS.length) break; // all maxed

    const usage = job.accountUsage[acctPtr];
    const acct  = GMAIL_ACCOUNTS.find(a => a.email === usage.email);

    try {
      await getTP(acct).sendMail({
        from: `Tope from ONBOARD3 <${acct.email}>`,
        replyTo: 'onboardweb3ng@gmail.com',
        to: user.email,
        subject: `${user.username}, ONBOARD3 is back`,
        html: buildBackEmailHtml(user.username),
        text: buildBackEmailText(user.username),
        headers: {
          'List-Unsubscribe': '<mailto:' + acct.email + '?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk'
        }
      });
      job.sentCount++;
      usage.sentToday++;
      usage.totalSent++;
      job.recentActivity.unshift({ email: user.email, username: user.username, status: 'sent', account: usage.name, timestamp: now });
    } catch (err) {
      job.failedCount++;
      job.recentActivity.unshift({ email: user.email, username: user.username, status: 'failed', account: usage.name, error: err.message.slice(0, 120), timestamp: now });
    }

    job.currentIndex++;
    acctPtr = (acctPtr + 1) % GMAIL_ACCOUNTS.length;
  }

  if (job.recentActivity.length > 120) job.recentActivity = job.recentActivity.slice(0, 120);
  await BulkMailJob.collection.updateOne({ _id: job._id }, { $set: {
    lastTickAt:    now,
    sentCount:     job.sentCount,
    failedCount:   job.failedCount,
    currentIndex:  job.currentIndex,
    status:        job.status,
    accountUsage:  job.accountUsage,
    recentActivity: job.recentActivity,
  }});
}

// GET /admin/bulkmail
router.get('/bulkmail', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.redirect('/admin');
  try {
    const job = await getOrCreateJob();
    res.render('admin/pages/bulkmail', { user: req.user, admin: req.user, page: 'bulkmail', job });
  } catch (err) {
    console.error('[bulkmail]', err);
    res.status(500).send('Error loading bulk mail page');
  }
});

// GET /admin/bulkmail/status (JSON)
router.get('/bulkmail/status', isAdminPage, async (req, res) => {
  try {
    const job = await BulkMailJob.findOne().lean();
    if (!job) return res.json({ status: 'idle', sentCount: 0, failedCount: 0, currentIndex: 0, totalRecipients: 0, recentActivity: [], accountUsage: [], comingSoonMode: true });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/bulkmail/start
router.post('/bulkmail/start', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    const job = await getOrCreateJob();
    if (job.status === 'completed') return res.json({ success: false, message: 'Job already completed. Reset to start again.' });
    job.status = 'running';
    if (!job.startedAt) job.startedAt = new Date();
    await job.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /admin/bulkmail/pause
router.post('/bulkmail/pause', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    const job = await BulkMailJob.findOne();
    if (job) { job.status = 'paused'; await job.save(); }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /admin/bulkmail/reset
router.post('/bulkmail/reset', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    await BulkMailJob.deleteMany();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /admin/bulkmail/tick (called by frontend to process a batch)
router.post('/bulkmail/tick', isAdminPage, async (req, res) => {
  try {
    const job = await BulkMailJob.findOne();
    if (!job || job.status !== 'running') return res.json({ skipped: true });
    await runTick(job);
    res.json({ success: true, sentCount: job.sentCount, failedCount: job.failedCount, currentIndex: job.currentIndex, status: job.status });
  } catch (err) {
    console.error('[tick]', err);
    res.json({ success: false, error: err.message });
  }
});

// POST /admin/bulkmail/coming-soon
router.post('/bulkmail/coming-soon', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    const { enabled } = req.body;
    const job = await getOrCreateJob();
    job.comingSoonMode = !!enabled;
    await job.save();
    res.json({ success: true, comingSoonMode: job.comingSoonMode });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /admin/bulkmail/test — send one test email
router.post('/bulkmail/test', isAdminPage, async (req, res) => {
  if (req.adminRole !== 'super_admin') return res.json({ success: false });
  try {
    const { email, username } = req.body;
    if (!email) return res.json({ success: false, message: 'email required' });
    const acct = GMAIL_ACCOUNTS[0];
    await getTP(acct).sendMail({
      from: `Tope from ONBOARD3 <${acct.email}>`,
      replyTo: 'onboardweb3ng@gmail.com',
      to: email,
      subject: `${username || 'Friend'}, ONBOARD3 is back`,
      html: buildBackEmailHtml(username || 'Friend'),
      text: buildBackEmailText(username || 'Friend'),
      headers: {
        'List-Unsubscribe': '<mailto:onboardweb3ng@gmail.com?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk'
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── TEMP: one-time wallet re-derivation (remove after running) ──
router.post('/migrate/rederive-wallets', async (req, res) => {
  if (req.body.secret !== 'onb3-rederive-2026') return res.status(403).json({ error: 'forbidden' });
  try {
    const { getAddress } = require('../utils/stacksWallet');
    const users = await User.find({ stacksWalletIndex: { $ne: null } }, 'username stacksWalletIndex stacksAddress');
    const results = [];
    for (const u of users) {
      const newAddress = await getAddress(u.stacksWalletIndex);
      await User.updateOne({ _id: u._id }, { $set: { stacksAddress: newAddress } });
      results.push({ username: u.username, index: u.stacksWalletIndex, old: u.stacksAddress, new: newAddress });
    }
    res.json({ success: true, updated: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;