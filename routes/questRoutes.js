const express = require("express");
const router = express.Router();
const questController = require("../controllers/questController");
// Middleware to check authentication
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

router.get("/", isAuthenticated, questController.getAllQuests);
router.get("/api/:questId/leaderboard", isAuthenticated, questController.getQuestLeaderboardJSON);
router.get("/:questId", isAuthenticated, questController.getQuestDetails);
router.post("/start", isAuthenticated, questController.startQuest);
router.post("/submit-task", isAuthenticated, questController.submitTask);
router.get("/leaderboard", isAuthenticated, questController.getQuestLeaderboard);
router.get("/leaderboard/:questId", isAuthenticated, questController.getQuestLeaderboard);



module.exports = router;
