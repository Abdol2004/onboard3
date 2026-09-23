const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/campaignController');

// Middleware to check authentication (same pattern as questRoutes.js)
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  // For API/fetch requests return JSON so the frontend can show a proper message
  if (req.method !== 'GET' || req.headers['accept']?.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Session expired — please refresh the page and log in again.', sessionExpired: true });
  }
  res.redirect('/auth');
};

// User-facing routes
router.get('/',   isAuthenticated, ctrl.getCampaigns);
router.get('/:id', isAuthenticated, ctrl.getCampaignDetails);
router.post('/:id/tasks/:taskIndex/submit', isAuthenticated, ctrl.submitTask);

module.exports = router;
