const express = require("express");
const router = express.Router();
const referralController = require("../controllers/referralController");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Referral routes
router.get("/", isAuthenticated, referralController.getReferralPage);

module.exports = router;