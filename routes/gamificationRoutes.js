const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const { authenticateUser } = require('../middleware/auth');

// Activity Page
router.get('/activity', authenticateUser, gamificationController.getActivityPage);

// Streak Management
router.post('/api/streak-checkin', authenticateUser, gamificationController.streakCheckin);
router.post('/api/streak-renew', authenticateUser, gamificationController.renewStreak);

// Badge Management
router.post('/api/claim-badge', authenticateUser, gamificationController.claimBadge);
router.get('/api/unclaimed-badges', authenticateUser, gamificationController.getUnclaimedBadges);

// Leaderboard
router.get('/api/leaderboard', authenticateUser, gamificationController.getLeaderboard);

// Search Challenge Leaderboard
router.get('/api/search-leaderboard', authenticateUser, gamificationController.searchChallengeLeaderboard);

// Fast check-in leaderboard (uses cache, computes async)
router.get('/api/checkin-leaderboard', authenticateUser, gamificationController.getCheckinLeaderboard);

module.exports = router;
