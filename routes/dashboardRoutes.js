const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Dashboard routes
router.get("/", isAuthenticated, dashboardController.getDashboard);
router.post("/update-profile", isAuthenticated, dashboardController.updateProfile);
router.post("/add-quest", isAuthenticated, dashboardController.addQuest);
router.post("/complete-quest", isAuthenticated, dashboardController.completeQuest);

module.exports = router;