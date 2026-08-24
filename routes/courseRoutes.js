const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");

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

// Public routes
router.get("/courses", isAuthenticated, courseController.getAvailableCourses);

// User application routes
router.post("/apply", isAuthenticated, courseController.submitApplication);
router.get("/my-applications", isAuthenticated, courseController.getUserApplications);
router.get("/applications/:applicationId", isAuthenticated, courseController.getApplicationById);
router.delete("/applications/:applicationId", isAuthenticated, courseController.cancelApplication);

// Admin routes (add admin middleware later)
router.get("/admin/applications", isAuthenticated, courseController.getAllApplications);
router.get("/admin/stats", isAuthenticated, courseController.getApplicationStats);
router.post("/admin/applications/:applicationId/approve", isAuthenticated, courseController.approveApplication);
router.post("/admin/applications/:applicationId/reject", isAuthenticated, courseController.rejectApplication);

module.exports = router;