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

// IMPORTANT: More specific routes MUST come before generic ones

// User registration routes
router.get("/user/registered", isAuthenticated, eventController.getUserRegisteredEvents);

// Get all events (list page)
router.get("/", isAuthenticated, eventController.getAllEvents);

// Admin routes
router.post("/:eventId/checkin/:userId", isAuthenticated, eventController.checkInAttendee);
router.get("/:eventId/stats", isAuthenticated, eventController.getEventStats);

// User event actions
router.post("/:eventId/register", isAuthenticated, eventController.registerForEvent);
router.delete("/:eventId/cancel", isAuthenticated, eventController.cancelRegistration);

// Get single event (MUST be last because it catches everything)
router.get("/:eventId", isAuthenticated, eventController.getEventById);

module.exports = router;