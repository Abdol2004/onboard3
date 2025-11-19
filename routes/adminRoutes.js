// routes/adminRoutes.js - FIXED VERSION
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ==================== MIDDLEWARE ====================

// Admin authentication middleware
const isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    const User = require("../models/User");
    const user = await User.findById(req.session.userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==================== DASHBOARD PAGE ====================

// Admin Dashboard Page (HTML)
router.get("/", isAdmin, adminController.getAdminDashboard);

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

// ==================== QUESTS ====================

// IMPORTANT: Put /stats BEFORE /:questId
router.get("/api/quests/stats", isAdmin, adminController.getQuestStats);
router.get("/api/quests", isAdmin, adminController.getAllQuests);
router.post("/api/quests", isAdmin, adminController.createQuest);

// Quest-specific routes
router.post("/api/quests/:questId/daily-task", isAdmin, adminController.addDailyTask);
router.delete("/api/quests/:questId/daily-task/:taskId", isAdmin, adminController.removeDailyTask);
router.get("/api/quests/:questId/leaderboard", isAdmin, adminController.getQuestLeaderboardAdmin);
router.patch("/api/quests/:questId/settings", isAdmin, adminController.updateQuestSettings);
router.get("/api/quests/:questId/export", isAdmin, adminController.exportQuestLeaderboard);
router.patch("/api/quests/:questId/toggle", isAdmin, adminController.toggleQuestStatus);
router.delete("/api/quests/:questId", isAdmin, adminController.deleteQuest);

// ==================== EVENTS ====================

// IMPORTANT: Put /stats BEFORE /:eventId
router.get("/api/events/stats", isAdmin, adminController.getEventStats);
router.get("/api/events", isAdmin, adminController.getAllEvents);
router.post("/api/events", isAdmin, adminController.createEvent);
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

module.exports = router;

// Add to your admin routes file
router.get('/api/quests/:questId/winners', adminController.getQuestWinners);
router.post('/api/quests/distribute-rewards', adminController.distributeQuestRewards);
router.get('/api/withdrawals', adminController.getAllWithdrawals);
router.get('/api/withdrawals/stats', adminController.getWithdrawalStats);
router.post('/api/withdrawals/:transactionId/approve', adminController.approveWithdrawal);
router.post('/api/withdrawals/:transactionId/reject', adminController.rejectWithdrawal);

// Add these routes if they don't exist
router.get('/api/quests/:questId/leaderboard', adminController.getQuestLeaderboardAdmin);
router.get('/api/quests/:questId/export', adminController.exportQuestLeaderboard);
// IMPORTANT: Put /stats and /export BEFORE /:applicationId
router.get("/api/ambassadors/stats", isAdmin, adminController.getAmbassadorStats);
router.get("/api/ambassadors/export", isAdmin, adminController.exportAmbassadorApplications);
router.get("/api/ambassadors", isAdmin, adminController.getAllAmbassadorApplications);
router.get("/api/ambassadors/:applicationId", isAdmin, adminController.getAmbassadorDetails);
router.post("/api/ambassadors/:applicationId/approve", isAdmin, adminController.approveAmbassadorApplication);
router.post("/api/ambassadors/:applicationId/reject", isAdmin, adminController.rejectAmbassadorApplication);
router.put("/api/ambassadors/:applicationId/metrics", isAdmin, adminController.updateAmbassadorMetrics);