const mongoose = require('mongoose');

// User Role Schema with benefits
const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ['citizen', 'early_citizen', 'contributor', 'maxi', 'captain', 'legend', 'major', 'core_team'],
        required: true
    },
    minXP: { type: Number, required: true },
    maxXP: { type: Number },
    benefits: {
        classDiscount: { type: Number, default: 0 }, // percentage
        jobBoardAccess: { type: Boolean, default: false },
        multiplayerAccess: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false },
        exclusiveQuests: { type: Boolean, default: false },
        customBadge: { type: Boolean, default: false },
        monthlyBonus: { type: Number, default: 0 }
    },
    color: { type: String, default: '#39FF14' },
    icon: { type: String, default: 'fa-user' }
}, { _id: false });

// Badge Schema
const badgeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    badgeType: {
        type: String,
        enum: [
            // Role Badges
            'citizen', 'early_citizen', 'contributor', 'maxi', 'captain', 'legend', 'major', 'core_team',
            // Achievement Badges
            'first_quest', 'quest_master', 'quiz_champion', 'referral_king',
            'streak_warrior', 'lucky_winner', 'multiplayer_champion',
            // Milestone Badges (XP milestone badges removed)
            'quest_5', 'quest_10', 'quest_25', 'quest_50',
            'referral_5', 'referral_10', 'referral_25',
            'streak_7', 'streak_30', 'streak_100'
        ]
    },
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String, default: 'fa-trophy' },
    color: { type: String, default: '#39FF14' },
    earnedAt: { type: Date, default: Date.now },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date },
    xpReward: { type: Number, default: 0 }
}, { timestamps: true });

// Daily Streak Schema
const streakSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastLoginDate: { type: Date },
    totalLogins: { type: Number, default: 0 },
    renewsUsedThisMonth: { type: Number, default: 0 },
    renewsResetDate: { type: Date },
    streakHistory: [{
        date: Date,
        xpEarned: Number,
        streakCount: Number
    }],
    motivationalTweet: { type: String }
}, { timestamps: true });

// Lucky Spin Schema
const luckySpinSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    spinDate: { type: Date, required: true },
    xpBet: { type: Number, required: true },
    result: {
        type: String,
        enum: ['double', 'lose_all', 'half', 'five_percent'],
        required: true
    },
    xpWon: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true }
}, { timestamps: true });

// Multiplayer Challenge Schema
const multiplayerChallengeSchema = new mongoose.Schema({
    challengeType: {
        type: String,
        enum: ['1v1', 'tournament', 'admin_hosted'],
        required: true
    },
    gameType: {
        type: String,
        enum: ['trivia_battle', 'speed_quest', 'memory_match', 'web3_quiz'],
        required: true
    },
    status: {
        type: String,
        enum: ['waiting', 'in_progress', 'completed', 'cancelled'],
        default: 'waiting'
    },
    entryXP: { type: Number, required: true },
    maxPlayers: { type: Number, default: 2 },
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        score: { type: Number, default: 0 },
        status: { type: String, enum: ['joined', 'playing', 'finished'], default: 'joined' }
    }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prizePool: { type: Number, required: true },
    usdcReward: { type: Number, default: 0 },
    startTime: { type: Date },
    endTime: { type: Date },
    gameData: { type: mongoose.Schema.Types.Mixed },
    isAdminHosted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Level System Schema
const levelSchema = new mongoose.Schema({
    level: { type: Number, required: true, unique: true },
    minXP: { type: Number, required: true },
    maxXP: { type: Number, required: true },
    title: { type: String, required: true },
    rewards: {
        xpBonus: { type: Number, default: 0 },
        unlockedFeature: String
    }
});

// User Level Progress (embedded in User model)
const userLevelSchema = new mongoose.Schema({
    currentLevel: { type: Number, default: 1 },
    currentXP: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
    xpToNextLevel: { type: Number, default: 100 }
}, { _id: false });

// Leaderboard Schema
const leaderboardSchema = new mongoose.Schema({
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'all_time'],
        required: true
    },
    category: {
        type: String,
        enum: ['xp', 'quests', 'referrals', 'streaks', 'multiplayer'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rankings: [{
        rank: Number,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        score: Number,
        role: String
    }]
}, { timestamps: true });

// Motivational Tweets Collection
const motivationalTweetSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['hustle', 'web3', 'motivation', 'success', 'persistence', 'innovation'],
        required: true
    },
    tweet: { type: String, required: true },
    author: { type: String },
    tags: [String],
    usageCount: { type: Number, default: 0 }
}, { timestamps: true });

// Create indexes for better performance
badgeSchema.index({ userId: 1, badgeType: 1 });
luckySpinSchema.index({ userId: 1, month: 1, year: 1 });
multiplayerChallengeSchema.index({ status: 1, createdAt: -1 });
leaderboardSchema.index({ period: 1, category: 1, endDate: -1 });

// Export models
const Badge = mongoose.model('Badge', badgeSchema);
const Streak = mongoose.model('Streak', streakSchema);
const LuckySpin = mongoose.model('LuckySpin', luckySpinSchema);
const MultiplayerChallenge = mongoose.model('MultiplayerChallenge', multiplayerChallengeSchema);
const Level = mongoose.model('Level', levelSchema);
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
const MotivationalTweet = mongoose.model('MotivationalTweet', motivationalTweetSchema);

module.exports = {
    Badge,
    Streak,
    LuckySpin,
    MultiplayerChallenge,
    Level,
    Leaderboard,
    MotivationalTweet,
    roleSchema,
    userLevelSchema
};
