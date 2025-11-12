// routes/adminRoutes.js
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

// Get all users
router.get("/api/users", isAdmin, adminController.getAllUsers);

// Get user count
router.get("/api/users/count", isAdmin, adminController.getUserCount);

// Get single user details
router.get("/api/users/:userId", isAdmin, adminController.getUserDetails);

// Update user
router.put("/api/users/:userId", isAdmin, adminController.updateUser);

// Delete user
router.delete("/api/users/:userId", isAdmin, adminController.deleteUser);

// Export users CSV
router.get("/api/users/export", isAdmin, adminController.exportUsers);

// ==================== QUESTS ====================

// Get all quests (admin view)
router.get("/api/quests", isAdmin, adminController.getAllQuests);

// Get quest statistics
router.get("/api/quests/stats", isAdmin, adminController.getQuestStats);

// Create quest
router.post("/api/quests", isAdmin, adminController.createQuest);

// Update quest
router.put("/api/quests/:questId", isAdmin, adminController.updateQuest);

// Toggle quest status
router.post("/api/quests/:questId/toggle", isAdmin, adminController.toggleQuestStatus);

// Delete quest
router.delete("/api/quests/:questId", isAdmin, adminController.deleteQuest);

// ==================== EVENTS ====================

// Get event statistics
router.get("/api/events/stats", isAdmin, adminController.getEventStats);

// Create event
router.post("/api/events", isAdmin, adminController.createEvent);

// Update event
router.put("/api/events/:eventId", isAdmin, adminController.updateEvent);

// Delete event
router.delete("/api/events/:eventId", isAdmin, adminController.deleteEvent);

// Get event registrations
router.get("/api/events/:eventId/registrations", isAdmin, adminController.getEventRegistrations);

// ==================== APPLICATIONS ====================

// Get all applications
router.get("/api/applications", isAdmin, adminController.getAllApplications);

// Get application statistics
router.get("/api/applications/stats", isAdmin, adminController.getApplicationStats);

// Approve application
router.post("/api/applications/:applicationId/approve", isAdmin, adminController.approveApplication);

// Reject application
router.post("/api/applications/:applicationId/reject", isAdmin, adminController.rejectApplication);

// Export applications CSV
router.get("/api/applications/export", isAdmin, adminController.exportApplications);

module.exports = router;