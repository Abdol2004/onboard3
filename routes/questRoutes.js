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
router.get("/leaderboard/:questId", isAuthenticated, questController.getQuestLeaderboard);

const now = new Date();

// Fetch past/expired quests
const pastQuests = await Quest.find({
  endDate: { $lt: now }, // Quest end date is before now
  _id: { $nin: user.completedQuests } // User didn't complete it
}).sort({ endDate: -1 }); // Sort by most recently expired first

// Pass to template
res.render('quests', {
  activeQuests,
  availableQuests,
  completedQuests,
  pastQuests, // Add this
  user,
  completedCount
});

module.exports = router;
