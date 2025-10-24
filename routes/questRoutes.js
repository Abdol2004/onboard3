const express = require("express");
const router = express.Router();
const questController = require("../controllers/questController");

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Quest routes
router.get("/", isAuthenticated, questController.getAllQuests);
router.get("/:questId", isAuthenticated, questController.getQuestDetails);
router.post("/start", isAuthenticated, questController.startQuest);
router.post("/submit-task", isAuthenticated, questController.submitTask);
router.get("/leaderboard", isAuthenticated, questController.getQuestLeaderboard);

module.exports = router;
