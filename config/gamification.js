// Gamification Configuration

// Role Definitions with XP Requirements and Benefits
const ROLES = {
    citizen: {
        name: 'Citizen',
        minXP: 0,
        maxXP: 9999,
        color: '#888888',
        icon: 'fa-user',
        benefits: {
            classDiscount: 5,
            jobBoardAccess: false,
            multiplayerAccess: false,
            prioritySupport: false,
            exclusiveQuests: false,
            customBadge: false,
            monthlyBonus: 1000
        },
        description: 'Welcome to ONBOARD3! Start your Web3 journey here.'
    },
    early_citizen: {
        name: 'Early Citizen',
        minXP: 0, // Special badge for Nov 15 - Dec 31, 2024 joiners
        color: '#FFD700',
        icon: 'fa-star',
        special: true, // Not based on XP, but join date
        benefits: {
            classDiscount: 5,
            jobBoardAccess: false,
            multiplayerAccess: false,
            prioritySupport: false,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 1500
        },
        description: 'You were here from the beginning! Special recognition for early adopters.'
    },
    contributor: {
        name: 'Contributor',
        minXP: 10000,
        maxXP: 24999,
        color: '#39FF14',
        icon: 'fa-code-branch',
        benefits: {
            classDiscount: 10,
            jobBoardAccess: false,
            multiplayerAccess: true,
            prioritySupport: false,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 2500
        },
        description: 'Active contributor to the ecosystem. Unlocked multiplayer challenges!'
    },
    captain: {
        name: 'Captain',
        minXP: 25000,
        maxXP: 49999,
        color: '#FF6B35',
        icon: 'fa-rocket',
        benefits: {
            classDiscount: 15,
            jobBoardAccess: false,
            multiplayerAccess: true,
            prioritySupport: false,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 5000
        },
        description: 'Leading the crew! Enhanced benefits across the platform.'
    },
    maxi: {
        name: 'Maxi',
        minXP: 50000,
        maxXP: 99999,
        color: '#00D9FF',
        icon: 'fa-layer-group',
        benefits: {
            classDiscount: 20,
            jobBoardAccess: true,
            multiplayerAccess: true,
            prioritySupport: true,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 10000
        },
        description: 'True believer! Job board access unlocked.'
    },
    legend: {
        name: 'Legend',
        minXP: 100000,
        maxXP: 249999,
        color: '#9D4EDD',
        icon: 'fa-bolt',
        benefits: {
            classDiscount: 30,
            jobBoardAccess: true,
            multiplayerAccess: true,
            prioritySupport: true,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 20000
        },
        description: 'Legendary status achieved! Premium perks unlocked.'
    },
    major: {
        name: 'Major',
        minXP: 250000,
        maxXP: 499999,
        color: '#FF0080',
        icon: 'fa-shield-alt',
        benefits: {
            classDiscount: 40,
            jobBoardAccess: true,
            multiplayerAccess: true,
            prioritySupport: true,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 35000
        },
        description: 'Major player in the ecosystem! Top-tier benefits.'
    },
    core_team: {
        name: 'Core Team',
        minXP: 500000,
        maxXP: Infinity,
        color: '#FFD700',
        icon: 'fa-crown',
        benefits: {
            classDiscount: 50,
            jobBoardAccess: true,
            multiplayerAccess: true,
            prioritySupport: true,
            exclusiveQuests: true,
            customBadge: true,
            monthlyBonus: 50000
        },
        description: 'Elite status! Maximum benefits and recognition.'
    }
};

// Daily Streak XP Rewards
const STREAK_REWARDS = {
    1: 5,
    2: 8,
    3: 10,
    4: 15,
    5: 20,
    6: 25,
    7: 30,
    8: 35,
    9: 40,
    10: 50,
    15: 75,
    20: 100,
    30: 150,
    50: 250,
    100: 500
};

// Streak reward formula for days not in STREAK_REWARDS
const getStreakReward = (day) => {
    if (STREAK_REWARDS[day]) return STREAK_REWARDS[day];

    // Exponential growth formula
    if (day <= 10) return 5 + (day - 1) * 5;
    if (day <= 30) return 50 + Math.floor((day - 10) * 5);
    if (day <= 100) return 150 + Math.floor((day - 30) * 5);

    return 500 + Math.floor((day - 100) * 10);
};

// Streak Renewal Cost (in XP)
const STREAK_RENEWAL_COST = (currentStreak) => {
    return Math.floor(currentStreak * 10); // 10 XP per streak day
};

const MAX_RENEWALS_PER_MONTH = 3;

// Lucky Spin Configuration
const LUCKY_SPIN = {
    availableDay: 20, // 20th of each month
    outcomes: {
        double: { probability: 0.25, multiplier: 2, label: 'Double!', color: '#39FF14' },
        lose_all: { probability: 0.15, multiplier: 0, label: 'Lost All', color: '#FF5252' },
        half: { probability: 0.35, multiplier: 0.5, label: '50%', color: '#FFC107' },
        five_percent: { probability: 0.25, multiplier: 0.05, label: '5%', color: '#888' }
    },
    minBet: 50,
    maxBet: 1000
};

// Multiplayer Challenge Configuration
const MULTIPLAYER = {
    minRoleRequired: 'contributor',
    minBet: 50,
    maxBet: 500,
    gameTypes: {
        trivia_battle: {
            name: 'Trivia Battle',
            description: 'Fast-paced Web3 trivia showdown',
            duration: 5, // minutes
            questionsCount: 10
        },
        speed_quest: {
            name: 'Speed Quest',
            description: 'Complete micro-quests faster than your opponent',
            duration: 10,
            questionsCount: 15
        },
        memory_match: {
            name: 'Memory Match',
            description: 'Match Web3 concepts and terms',
            duration: 3,
            pairs: 8
        },
        web3_quiz: {
            name: 'Web3 Quiz Duel',
            description: 'Ultimate Web3 knowledge test',
            duration: 8,
            questionsCount: 20
        }
    },
    adminHosted: {
        minPlayers: 10,
        maxPlayers: 100,
        minBet: 50,
        entryFee: 100 // XP
    }
};

// Badge Definitions
const BADGES = {
    // Role Badges (auto-awarded) - Only role-based badges
    citizen: { name: 'Citizen', icon: 'fa-user', color: '#888888', xpReward: 50 },
    early_citizen: { name: 'Early Citizen', icon: 'fa-star', color: '#FFD700', xpReward: 100 },
    contributor: { name: 'Contributor', icon: 'fa-code-branch', color: '#39FF14', xpReward: 150 },
    captain: { name: 'Captain', icon: 'fa-rocket', color: '#FF6B35', xpReward: 250 },
    maxi: { name: 'Maxi', icon: 'fa-layer-group', color: '#00D9FF', xpReward: 350 },
    legend: { name: 'Legend', icon: 'fa-bolt', color: '#9D4EDD', xpReward: 500 },
    major: { name: 'Major', icon: 'fa-shield-alt', color: '#FF0080', xpReward: 750 },
    core_team: { name: 'Core Team', icon: 'fa-crown', color: '#FFD700', xpReward: 1000 },

    // Achievement Badges
    first_quest: { name: 'First Quest', description: 'Completed your first quest', icon: 'fa-flag-checkered', color: '#39FF14', xpReward: 25 },
    quest_master: { name: 'Quest Master', description: 'Completed 50 quests', icon: 'fa-trophy', color: '#FFD700', xpReward: 200 },
    quiz_champion: { name: 'Quiz Champion', description: 'Won a quiz competition', icon: 'fa-gamepad', color: '#00D9FF', xpReward: 150 },
    referral_king: { name: 'Referral King', description: 'Referred 25+ users', icon: 'fa-users', color: '#9D4EDD', xpReward: 250 },
    streak_warrior: { name: 'Streak Warrior', description: '100-day login streak', icon: 'fa-fire', color: '#FF6B35', xpReward: 500 },
    lucky_winner: { name: 'Lucky Winner', description: 'Won the lucky spin', icon: 'fa-dice', color: '#FFD700', xpReward: 100 },
    multiplayer_champion: { name: 'Multiplayer Champion', description: 'Won 10 multiplayer challenges', icon: 'fa-swords', color: '#FF0080', xpReward: 300 },

    // Quest Milestone Badges
    quest_5: { name: 'Quest Starter', description: 'Completed 5 quests', icon: 'fa-tasks', color: '#39FF14', xpReward: 25 },
    quest_10: { name: 'Quest Enthusiast', description: 'Completed 10 quests', icon: 'fa-tasks', color: '#39FF14', xpReward: 50 },
    quest_25: { name: 'Quest Expert', description: 'Completed 25 quests', icon: 'fa-tasks', color: '#00D9FF', xpReward: 100 },
    quest_50: { name: 'Quest Legend', description: 'Completed 50 quests', icon: 'fa-tasks', color: '#FFD700', xpReward: 200 },

    // Referral Milestone Badges
    referral_5: { name: 'Networker', description: 'Referred 5 users', icon: 'fa-user-friends', color: '#39FF14', xpReward: 50 },
    referral_10: { name: 'Influencer', description: 'Referred 10 users', icon: 'fa-user-friends', color: '#00D9FF', xpReward: 100 },
    referral_25: { name: 'Community Builder', description: 'Referred 25 users', icon: 'fa-user-friends', color: '#FFD700', xpReward: 250 },

    // Streak Milestone Badges
    streak_7: { name: '7-Day Streak', description: '7-day login streak', icon: 'fa-fire', color: '#39FF14', xpReward: 30 },
    streak_30: { name: '30-Day Streak', description: '30-day login streak', icon: 'fa-fire', color: '#FF6B35', xpReward: 150 },
    streak_100: { name: '100-Day Streak', description: '100-day login streak', icon: 'fa-fire', color: '#FFD700', xpReward: 500 }
};

// Level System
const LEVELS = [
    { level: 1, minXP: 0, maxXP: 99, title: 'Newcomer' },
    { level: 2, minXP: 100, maxXP: 249, title: 'Explorer' },
    { level: 3, minXP: 250, maxXP: 499, title: 'Pathfinder' },
    { level: 4, minXP: 500, maxXP: 999, title: 'Adventurer' },
    { level: 5, minXP: 1000, maxXP: 1999, title: 'Warrior' },
    { level: 6, minXP: 2000, maxXP: 3499, title: 'Champion' },
    { level: 7, minXP: 3500, maxXP: 5499, title: 'Hero' },
    { level: 8, minXP: 5500, maxXP: 7999, title: 'Elite' },
    { level: 9, minXP: 8000, maxXP: 11999, title: 'Master' },
    { level: 10, minXP: 12000, maxXP: 16999, title: 'Grandmaster' },
    { level: 11, minXP: 17000, maxXP: 24999, title: 'Legend' },
    { level: 12, minXP: 25000, maxXP: 34999, title: 'Mythic' },
    { level: 13, minXP: 35000, maxXP: Infinity, title: 'Immortal' }
];

module.exports = {
    ROLES,
    STREAK_REWARDS,
    getStreakReward,
    STREAK_RENEWAL_COST,
    MAX_RENEWALS_PER_MONTH,
    LUCKY_SPIN,
    MULTIPLAYER,
    BADGES,
    LEVELS
};
