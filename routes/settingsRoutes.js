const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Settings routes
router.get("/", isAuthenticated, settingsController.getSettingsPage);
router.post("/profile", isAuthenticated, settingsController.updateProfile);
router.post("/password", isAuthenticated, settingsController.updatePassword);
router.post("/notifications", isAuthenticated, settingsController.updateNotifications);
router.post("/privacy", isAuthenticated, settingsController.updatePrivacy);
router.post("/wallet", isAuthenticated, settingsController.updateWallet);

module.exports = router;