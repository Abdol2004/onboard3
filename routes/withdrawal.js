// routes/withdrawal.js
const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const adminController = require("../controllers/adminController");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// User withdrawal routes
router.get("/", isAuthenticated, withdrawalController.getWithdrawalPage);
router.post("/request", isAuthenticated, withdrawalController.requestWithdrawal);
router.post("/cancel/:transactionId", isAuthenticated, withdrawalController.cancelWithdrawal);
router.get("/history", isAuthenticated, withdrawalController.getTransactionHistory);

module.exports = router;

// ==========================================
// routes/admin.js - ADD these routes to your existing admin routes

// Quest reward distribution
router.get('/api/quests/:questId/winners', adminController.getQuestWinners);
router.post('/api/quests/distribute-rewards', adminController.distributeQuestRewards);

// Withdrawal management
router.get('/api/withdrawals', adminController.getAllWithdrawals);
router.get('/api/withdrawals/stats', adminController.getWithdrawalStats);
router.post('/api/withdrawals/:transactionId/approve', adminController.approveWithdrawal);
router.post('/api/withdrawals/:transactionId/reject', adminController.rejectWithdrawal);