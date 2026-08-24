const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: "Please login to continue"
  });
};

// Optional authentication - sets user if logged in but doesn't require it
const optionalAuth = (req, res, next) => {
  // Just pass through, user will be in session if logged in
  next();
};

// IMPORTANT: More specific routes MUST come before generic ones

// User registration routes (requires auth)
router.get("/user/registered", isAuthenticated, eventController.getUserRegisteredEvents);

// Get all events (list page) - PUBLIC, no auth required
router.get("/", optionalAuth, eventController.getAllEvents);

// Admin routes
router.post("/:eventId/checkin/:userId", isAuthenticated, eventController.checkInAttendee);
router.get("/:eventId/stats", isAuthenticated, eventController.getEventStats);
router.post("/:eventId/send-reminders", isAuthenticated, eventController.sendEventReminders);
router.post("/:eventId/approve/:userId", isAuthenticated, eventController.approveRegistration);
router.post("/:eventId/reject/:userId", isAuthenticated, eventController.rejectRegistration);
router.post("/:eventId/walk-in", isAuthenticated, eventController.addWalkIn);

// User event actions (requires auth)
router.post("/:eventId/register", isAuthenticated, eventController.registerForEvent);
router.delete("/:eventId/cancel", isAuthenticated, eventController.cancelRegistration);

// Get single event - PUBLIC, no auth required (MUST be last because it catches everything)
router.get("/:eventId", optionalAuth, eventController.getEventById);

module.exports = router;