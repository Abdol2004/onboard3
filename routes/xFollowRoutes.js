// routes/xFollowRoutes.js
const express = require("express");
const router = express.Router();
const xFollowController = require("../controllers/xFollowController");

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Get X Follow Network page
router.get("/", isAuthenticated, xFollowController.getXFollowPage);

// Update X handle
router.post("/update-handle", isAuthenticated, xFollowController.updateXHandle);

// Mark as followed
router.post("/mark-followed", isAuthenticated, xFollowController.markFollowed);

// Unmark as followed
router.post("/unmark-followed", isAuthenticated, xFollowController.unmarkFollowed);

module.exports = router;