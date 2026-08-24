const User = require('../models/User');
const { Badge, Streak, LuckySpin, MultiplayerChallenge, Level, Leaderboard, MotivationalTweet } = require('../models/Gamification');
const { ROLES, getStreakReward, STREAK_RENEWAL_COST, MAX_RENEWALS_PER_MONTH, BADGES, LEVELS } = require('../config/gamification');
const { notify } = require('../utils/notificationService');

// Leaderboard cache - recomputed at most once every 3 minutes
let leaderboardCache = null;
let leaderboardCacheTime = 0;
const LEADERBOARD_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// ─── February 2026 Challenge — FINAL RESULTS (LOCKED) ───────────────────────
// Challenge is over. These are the official final rankings.
// When CHALLENGE_LOCKED = true, the leaderboard is frozen: new check-ins have
// no effect on the displayed order.
const CHALLENGE_LOCKED = true;
const FINAL_RANKINGS = ['Luckee', 'Bolacrypt', 'Web3Guru_10', 'Gayton100']; // Top 4 in order

// Override specific stat values for the locked leaderboard display.
// Keys must match username exactly (case-sensitive).
const FINAL_STATS_OVERRIDE = {
    'Bolacrypt': { totalCheckins: 31 },
    'Gayton100': { totalCheckins: 30 }
};
// ─────────────────────────────────────────────────────────────────────────────

// Get user's current role based on XP
const getUserRole = (xp, joinDate) => {
    // Check for early_citizen badge (Nov 15 - Dec 31, 2024)
    const earlyStart = new Date('2024-11-15');
    const earlyEnd = new Date('2024-12-31T23:59:59');
    const userJoinDate = new Date(joinDate);

    const isEarlyCitizen = userJoinDate >= earlyStart && userJoinDate <= earlyEnd;

    // Find role based on XP - check from highest to lowest to ensure correct match
    const roleOrder = ['core_team', 'major', 'legend', 'maxi', 'captain', 'contributor', 'citizen'];
    let currentRole = 'citizen'; // default

    for (const roleKey of roleOrder) {
        const roleData = ROLES[roleKey];
        if (!roleData || roleData.special) continue; // Skip special roles like early_citizen

        if (xp >= roleData.minXP && (roleData.maxXP === Infinity || xp <= roleData.maxXP)) {
            currentRole = roleKey;
            break;
        }
    }

    return {
        currentRole: ROLES[currentRole],
        roleKey: currentRole,
        isEarlyCitizen,
        xp
    };
};

// Get user's current level
const getUserLevel = (xp) => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].minXP) {
            const currentLevel = LEVELS[i];
            const nextLevel = LEVELS[i + 1];

            return {
                level: currentLevel.level,
                title: currentLevel.title,
                currentXP: xp,
                minXP: currentLevel.minXP,
                maxXP: currentLevel.maxXP,
                nextLevel: nextLevel ? {
                    level: nextLevel.level,
                    title: nextLevel.title,
                    requiredXP: nextLevel.minXP
                } : null,
                progress: nextLevel ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 : 100
            };
        }
    }

    return LEVELS[0];
};

// Activity Page - Show all gamification data
exports.getActivityPage = async (req, res) => {
    try {
        const userId = req.user._id;

        // Run all user-specific queries in parallel
        const [user, userBadges, existingStreak] = await Promise.all([
            User.findById(userId).lean(),
            Badge.find({ userId }).sort({ earnedAt: -1 }).lean(),
            // Exclude streakHistory - we don't need the full history for the user's own stats
            Streak.findOne({ userId }).select('-streakHistory').lean()
        ]);

        if (!user) {
            return res.redirect('/auth');
        }

        // Get user role and level
        const roleData = getUserRole(user.xp || 0, user.createdAt);
        const levelData = getUserLevel(user.xp || 0);

        const claimedBadges = userBadges.filter(b => b.claimed);
        const unclaimedBadges = userBadges.filter(b => !b.claimed);

        // Create streak if it doesn't exist
        let streak = existingStreak;
        if (!streak) {
            streak = await Streak.create({
                userId,
                currentStreak: 0,
                longestStreak: 0,
                totalLogins: 0
            });
        }

        // Get next role info - use explicit order to guarantee correct progression
        let nextRole = null;
        const roleKeys = ['citizen', 'contributor', 'captain', 'maxi', 'legend', 'major', 'core_team'];
        const currentRoleIndex = roleKeys.indexOf(roleData.roleKey);
        if (currentRoleIndex < roleKeys.length - 1) {
            const nextRoleKey = roleKeys[currentRoleIndex + 1];
            nextRole = {
                ...ROLES[nextRoleKey],
                key: nextRoleKey,
                xpNeeded: ROLES[nextRoleKey].minXP - user.xp
            };
        }

        // Calculate XP to next role
        const progressToNextRole = nextRole ?
            ((user.xp - roleData.currentRole.minXP) / (nextRole.xpNeeded + (user.xp - roleData.currentRole.minXP))) * 100 : 100;

        // ── Leaderboard: skip ALL aggregation on page render ───────────
        // Leaderboard is loaded client-side via /dashboard/api/checkin-leaderboard
        // Skip the heavy Streak.aggregate() entirely here.

        if (false) { // never runs — kept for block structure
        const now2 = Date.now();
        if (!leaderboardCache || (!CHALLENGE_LOCKED && (now2 - leaderboardCacheTime) > LEADERBOARD_CACHE_TTL)) {
            // Cache miss - run the aggregation
            const rawStreaks = await Streak.aggregate([
                { $match: { totalLogins: { $gt: 0 } } },
                {
                    $project: {
                        userId: 1,
                        streakHistory: {
                            $filter: {
                                input: { $ifNull: ['$streakHistory', []] },
                                as: 'h',
                                cond: {
                                    $and: [
                                        { $gte: ['$$h.date', challengeStartDate] },
                                        { $lte: ['$$h.date', challengeEndDate] }
                                    ]
                                }
                            }
                        }
                    }
                },
                { $match: { 'streakHistory.0': { $exists: true } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userInfo',
                        pipeline: [{ $project: { username: 1 } }]
                    }
                },
                { $unwind: '$userInfo' }
            ]);

            const allStreaks = rawStreaks.map(s => ({
                ...s,
                userId: { _id: s.userInfo._id, username: s.userInfo.username }
            }));

            leaderboardCache = allStreaks
                .filter(s => s.userId && s.streakHistory && s.streakHistory.length > 0)
                .map(s => {
                    const challengeCheckins = s.streakHistory;
                    let challengeStreak = 0;
                    if (challengeCheckins.length > 0) {
                        const sortedCheckins = [...challengeCheckins].sort((a, b) =>
                            new Date(a.date) - new Date(b.date)
                        );
                        let expectedDate = new Date(sortedCheckins[0].date);
                        expectedDate = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());
                        for (const checkin of sortedCheckins) {
                            const checkinDate = new Date(checkin.date);
                            const checkinDateOnly = new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate());
                            if (checkinDateOnly.getTime() === expectedDate.getTime()) {
                                challengeStreak++;
                                expectedDate.setDate(expectedDate.getDate() + 1);
                            } else if (checkinDateOnly > expectedDate) {
                                challengeStreak = 1;
                                expectedDate = new Date(checkinDateOnly);
                                expectedDate.setDate(expectedDate.getDate() + 1);
                            }
                        }
                    }
                    let avgHour = null;
                    if (challengeCheckins.length > 0) {
                        const totalHours = challengeCheckins.reduce((sum, h) => sum + new Date(h.date).getUTCHours(), 0);
                        avgHour = Math.round(totalHours / challengeCheckins.length);
                    }
                    const firstCheckin = challengeCheckins.length > 0
                        ? new Date(Math.min(...challengeCheckins.map(c => new Date(c.date).getTime())))
                        : null;
                    return {
                        odId: s._id,
                        username: s.userId.username,
                        odUserId: s.userId._id.toString(),
                        challengeStreak,
                        totalCheckins: challengeCheckins.length,
                        avgCheckInTime: avgHour !== null ? `${String(avgHour).padStart(2, '0')}:00` : null,
                        avgHour,
                        firstCheckin
                    };
                })
                .filter(p => p.totalCheckins > 0)
                .sort((a, b) => {
                    if (b.totalCheckins !== a.totalCheckins) return b.totalCheckins - a.totalCheckins;
                    if (b.challengeStreak !== a.challengeStreak) return b.challengeStreak - a.challengeStreak;
                    if (a.avgHour !== null && b.avgHour !== null && a.avgHour !== b.avgHour) return a.avgHour - b.avgHour;
                    if (a.firstCheckin && b.firstCheckin) return a.firstCheckin - b.firstCheckin;
                    return 0;
                });

            // If challenge is locked, pin the final top 4 in official order
            // and apply any stat overrides for the frozen display
            if (CHALLENGE_LOCKED && FINAL_RANKINGS.length > 0) {
                // Apply stat overrides (e.g. admin-set final check-in counts)
                leaderboardCache = leaderboardCache.map(p => {
                    const override = FINAL_STATS_OVERRIDE[p.username];
                    return override ? { ...p, ...override } : p;
                });

                const finalLower = FINAL_RANKINGS.map(n => n.toLowerCase());
                const winners = FINAL_RANKINGS
                    .map(name => leaderboardCache.find(p => p.username.toLowerCase() === name.toLowerCase()))
                    .filter(Boolean);
                const rest = leaderboardCache.filter(p => !finalLower.includes(p.username.toLowerCase()));
                leaderboardCache = [...winners, ...rest];
            }

            leaderboardCacheTime = now2;
        }
        } // end if(false) — leaderboard skipped on page render

        // Check monthly claim status SERVER-SIDE
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const isFirstOfMonth = currentDay <= 3;
        const lastClaim = user.lastMonthlyClaimDate;

        let canClaimMonthly = false;
        if (isFirstOfMonth && roleData.currentRole.benefits && roleData.currentRole.benefits.monthlyBonus > 0) {
            if (!lastClaim) {
                canClaimMonthly = true;
            } else {
                const lastClaimDate = new Date(lastClaim);
                const lastClaimMonth = lastClaimDate.getMonth();
                const lastClaimYear = lastClaimDate.getFullYear();
                // Can only claim if last claim was NOT in the current month
                canClaimMonthly = !(lastClaimMonth === currentMonth && lastClaimYear === currentYear);
            }
        }
        console.log(`[ACTIVITY] User ${userId} - lastMonthlyClaimDate: ${lastClaim}, canClaimMonthly: ${canClaimMonthly}`);

        // Pass empty leaderboard — client loads it async for faster page render
        res.render('dashboard/activity', {
            user,
            roleData,
            levelData,
            claimedBadges,
            unclaimedBadges,
            streak,
            nextRole,
            progressToNextRole,
            allBadges: BADGES,
            ROLES_CONFIG: ROLES,
            challengeLeaderboard: [],   // loaded client-side
            totalParticipants: 0,        // loaded client-side
            currentUserRank: null,
            currentUserData: null,
            canClaimMonthly,
            challengeLocked: CHALLENGE_LOCKED
        });

    } catch (error) {
        console.error('Error loading activity page:', error);
        res.status(500).send('Error loading activity page');
    }
};

// Daily Streak Check-in
exports.streakCheckin = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        let streak = await Streak.findOne({ userId });
        if (!streak) {
            streak = await Streak.create({
                userId,
                currentStreak: 0,
                longestStreak: 0,
                totalLogins: 0
            });
        }

        // Store all dates as UTC midnight for timezone-safe comparisons
        let today;
        if (req.body.localDate) {
            // Parse the client's local date string (YYYY-MM-DD) and store as UTC midnight
            const [year, month, day] = req.body.localDate.split('-').map(Number);
            today = new Date(Date.UTC(year, month - 1, day));
        } else {
            // Fallback: use server's local date as UTC midnight
            const now = new Date();
            today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        }

        const lastLogin = streak.lastLoginDate ? new Date(streak.lastLoginDate) : null;

        // Use ISO string date comparison (always UTC) for timezone safety
        const toDateStr = (d) => d.toISOString().split('T')[0];
        const todayStr = req.body.localDate || toDateStr(today);
        const lastLoginStr = lastLogin ? toDateStr(lastLogin) : null;

        if (lastLoginStr && lastLoginStr === todayStr) {
            return res.json({
                success: false,
                message: 'Already checked in today!',
                streak: streak.currentStreak
            });
        }

        // Check if yesterday (using UTC to match stored dates)
        const yesterday = new Date(today);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = toDateStr(yesterday);

        let newStreak = 1;
        if (lastLoginStr && lastLoginStr === yesterdayStr) {
            // Continue streak
            newStreak = streak.currentStreak + 1;
        } else if (lastLoginStr) {
            // Streak broken, start over
            newStreak = 1;
        }

        // Calculate XP reward
        const xpReward = getStreakReward(newStreak);

        // Get random motivational tweet
        const tweetCount = await MotivationalTweet.countDocuments();
        const randomIndex = Math.floor(Math.random() * tweetCount);
        const motivationalTweet = await MotivationalTweet.findOne().skip(randomIndex);

        // Update streak
        streak.currentStreak = newStreak;
        streak.longestStreak = Math.max(streak.longestStreak, newStreak);
        streak.lastLoginDate = today;
        streak.totalLogins += 1;
        streak.motivationalTweet = motivationalTweet ? motivationalTweet.tweet : "Keep building in Web3! 🚀";

        // Increment usage count
        if (motivationalTweet) {
            motivationalTweet.usageCount += 1;
            await motivationalTweet.save();
        }

        // Store the normalized client date for consistent calendar display across timezones
        streak.streakHistory.push({
            date: today,
            xpEarned: xpReward,
            streakCount: newStreak
        });

        await streak.save();

        // Award XP
        user.xp = (user.xp || 0) + xpReward;
        await user.save();

        // Check for streak badges
        const streakBadges = [
            { days: 7, type: 'streak_7' },
            { days: 30, type: 'streak_30' },
            { days: 100, type: 'streak_100' }
        ];

        for (const badge of streakBadges) {
            if (newStreak === badge.days) {
                const existingBadge = await Badge.findOne({ userId, badgeType: badge.type });
                if (!existingBadge) {
                    await Badge.create({
                        userId,
                        badgeType: badge.type,
                        name: BADGES[badge.type].name,
                        description: BADGES[badge.type].description,
                        icon: BADGES[badge.type].icon,
                        color: BADGES[badge.type].color,
                        xpReward: BADGES[badge.type].xpReward
                    });
                    // Notify user about new badge
                    notify(userId, {
                        type: 'badge',
                        title: 'Badge Unlocked!',
                        message: `You earned the "${BADGES[badge.type].name}" badge for a ${badge.days}-day streak!`,
                        link: '/dashboard/activity'
                    }).catch(() => {});
                }
            }
        }

        res.json({
            success: true,
            message: `Day ${newStreak} streak! +${xpReward} XP`,
            streak: newStreak,
            xpReward,
            motivationalTweet: streak.motivationalTweet,
            totalXP: user.xp
        });

    } catch (error) {
        console.error('Error checking in:', error);
        res.status(500).json({ success: false, message: 'Error checking in' });
    }
};

// Renew Streak with XP
exports.renewStreak = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        const streak = await Streak.findOne({ userId });

        if (!streak || streak.currentStreak === 0) {
            return res.json({
                success: false,
                message: 'No streak to renew'
            });
        }

        // Check renewals this month
        const now = new Date();
        const resetDate = streak.renewsResetDate ? new Date(streak.renewsResetDate) : null;

        if (!resetDate || resetDate.getMonth() !== now.getMonth()) {
            streak.renewsUsedThisMonth = 0;
            streak.renewsResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        if (streak.renewsUsedThisMonth >= MAX_RENEWALS_PER_MONTH) {
            return res.json({
                success: false,
                message: `Maximum ${MAX_RENEWALS_PER_MONTH} renewals per month reached`
            });
        }

        // Calculate cost
        const cost = STREAK_RENEWAL_COST(streak.currentStreak);

        if (user.xp < cost) {
            return res.json({
                success: false,
                message: `Not enough XP. Need ${cost} XP to renew.`
            });
        }

        // Renew streak
        user.xp -= cost;
        await user.save();

        streak.lastLoginDate = new Date();
        streak.renewsUsedThisMonth += 1;
        await streak.save();

        res.json({
            success: true,
            message: `Streak renewed! -${cost} XP`,
            streak: streak.currentStreak,
            renewsLeft: MAX_RENEWALS_PER_MONTH - streak.renewsUsedThisMonth,
            totalXP: user.xp
        });

    } catch (error) {
        console.error('Error renewing streak:', error);
        res.status(500).json({ success: false, message: 'Error renewing streak' });
    }
};

// Claim Badge and Award XP
exports.claimBadge = async (req, res) => {
    try {
        const userId = req.user._id;
        const { badgeId } = req.body;

        const badge = await Badge.findOne({ _id: badgeId, userId });

        if (!badge) {
            return res.json({
                success: false,
                message: 'Badge not found'
            });
        }

        if (badge.claimed) {
            return res.json({
                success: false,
                message: 'Badge already claimed'
            });
        }

        // Claim badge and award XP
        badge.claimed = true;
        badge.claimedAt = new Date();
        await badge.save();

        const user = await User.findById(userId);
        user.xp = (user.xp || 0) + badge.xpReward;
        await user.save();

        res.json({
            success: true,
            message: `Badge claimed! +${badge.xpReward} XP`,
            xpReward: badge.xpReward,
            totalXP: user.xp
        });

    } catch (error) {
        console.error('Error claiming badge:', error);
        res.status(500).json({ success: false, message: 'Error claiming badge' });
    }
};

// Get Unclaimed Badges (for popup)
exports.getUnclaimedBadges = async (req, res) => {
    try {
        const userId = req.user._id;

        const unclaimedBadges = await Badge.find({
            userId,
            claimed: false
        }).sort({ earnedAt: -1 });

        res.json({
            success: true,
            badges: unclaimedBadges,
            count: unclaimedBadges.length
        });

    } catch (error) {
        console.error('Error fetching unclaimed badges:', error);
        res.status(500).json({ success: false, message: 'Error fetching badges' });
    }
};

// Get Leaderboard
// ── Fast check-in leaderboard — uses/builds cache ────────────────────────────
exports.getCheckinLeaderboard = async (req, res) => {
    try {
        const userId = req.user._id;
        const now2 = Date.now();

        // Build cache if stale
        if (!leaderboardCache || (!CHALLENGE_LOCKED && (now2 - leaderboardCacheTime) > LEADERBOARD_CACHE_TTL)) {
            const challengeStart = new Date('2026-02-01');
            challengeStart.setHours(0,0,0,0);
            const challengeEnd = new Date('2026-03-02');
            challengeEnd.setHours(23,59,59,999);

            const rawStreaks = await Streak.aggregate([
                { $match: { totalLogins: { $gt: 0 } } },
                { $project: { userId: 1, streakHistory: { $filter: { input: { $ifNull: ['$streakHistory',[]] }, as:'h', cond: { $and: [{ $gte:['$$h.date',challengeStart] },{ $lte:['$$h.date',challengeEnd] }] } } } } },
                { $match: { 'streakHistory.0': { $exists: true } } },
                { $lookup: { from:'users', localField:'userId', foreignField:'_id', as:'userInfo', pipeline:[{ $project:{ username:1 } }] } },
                { $unwind: '$userInfo' }
            ]);

            leaderboardCache = rawStreaks
                .filter(s => s.userId && s.streakHistory?.length)
                .map(s => {
                    const checks = s.streakHistory;
                    let streak = 0;
                    if (checks.length) {
                        const sorted = [...checks].sort((a,b) => new Date(a.date)-new Date(b.date));
                        let exp = new Date(sorted[0].date); exp.setHours(0,0,0,0);
                        for (const c of sorted) {
                            const d = new Date(c.date); d.setHours(0,0,0,0);
                            if (d.getTime()===exp.getTime()) { streak++; exp.setDate(exp.getDate()+1); }
                            else if (d>exp) { streak=1; exp=new Date(d); exp.setDate(exp.getDate()+1); }
                        }
                    }
                    const avgHour = checks.length ? Math.round(checks.reduce((s,h)=>s+new Date(h.date).getUTCHours(),0)/checks.length) : null;
                    return {
                        username: s.userInfo.username, odUserId: s.userId._id.toString(),
                        totalCheckins: checks.length, challengeStreak: streak,
                        avgHour, avgCheckInTime: avgHour!==null ? String(avgHour).padStart(2,'0')+':00' : null,
                        firstCheckin: checks.length ? new Date(Math.min(...checks.map(c=>new Date(c.date)))) : null
                    };
                })
                .filter(p => p.totalCheckins > 0)
                .sort((a,b) => b.totalCheckins-a.totalCheckins || b.challengeStreak-a.challengeStreak || (a.avgHour??99)-(b.avgHour??99));
            leaderboardCacheTime = now2;
        }

        const lb = (leaderboardCache||[]).map((p,i) => ({
            ...p, isCurrentUser: p.odUserId === userId.toString()
        }));
        const userIdx = lb.findIndex(p => p.isCurrentUser);

        res.json({
            success: true,
            leaderboard: lb.slice(0, 50),
            total: lb.length,
            userRank: userIdx !== -1 ? userIdx + 1 : null,
            userData: userIdx !== -1 ? lb[userIdx] : null
        });
    } catch (err) {
        console.error('Checkin leaderboard error:', err);
        res.json({ success: true, leaderboard: [], total: 0, userRank: null, userData: null });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const { type = 'xp', period = 'all' } = req.query;

        let leaderboard;

        if (type === 'xp') {
            leaderboard = await User.find({
                xp: { $exists: true, $ne: null, $gte: 0 }
            })
                .select('username xp profilePicture')
                .sort({ xp: -1 })
                .limit(100);
        } else if (type === 'streaks') {
            leaderboard = await Streak.find()
                .populate('userId', 'username profilePicture')
                .sort({ currentStreak: -1 })
                .limit(100);
        } else if (type === 'quests') {
            leaderboard = await User.find()
                .select('username completedQuests profilePicture')
                .sort({ 'completedQuests.length': -1 })
                .limit(100);
        }

        res.json({
            success: true,
            leaderboard,
            type,
            period
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Error fetching leaderboard' });
    }
};

// Auto-award role badges when user levels up
exports.checkAndAwardRoleBadges = async (userId, currentXP) => {
    try {
        const user = await User.findById(userId);
        const roleData = getUserRole(currentXP, user.createdAt);

        // Award early citizen badge if eligible
        if (roleData.isEarlyCitizen) {
            const existingBadge = await Badge.findOne({ userId, badgeType: 'early_citizen' });
            if (!existingBadge && BADGES.early_citizen) {
                await Badge.create({
                    userId,
                    badgeType: 'early_citizen',
                    name: BADGES.early_citizen.name,
                    description: BADGES.early_citizen.description,
                    icon: BADGES.early_citizen.icon,
                    color: BADGES.early_citizen.color,
                    xpReward: BADGES.early_citizen.xpReward
                });
                console.log(`✅ Awarded early_citizen badge to user ${userId}`);
            }
        }

        // Award ALL role badges that the user has achieved (not just current)
        // Role order from lowest to highest XP requirement
        const roleOrder = ['citizen', 'contributor', 'captain', 'maxi', 'legend', 'major', 'core_team'];

        for (const roleKey of roleOrder) {
            const roleConfig = ROLES[roleKey];
            if (!roleConfig || roleConfig.special) continue;

            // Check if user's XP is >= this role's minimum XP
            if (currentXP >= roleConfig.minXP) {
                const existingRoleBadge = await Badge.findOne({ userId, badgeType: roleKey });
                if (!existingRoleBadge && BADGES[roleKey]) {
                    await Badge.create({
                        userId,
                        badgeType: roleKey,
                        name: BADGES[roleKey].name,
                        description: BADGES[roleKey].description || `Achieved ${BADGES[roleKey].name} role`,
                        icon: BADGES[roleKey].icon,
                        color: BADGES[roleKey].color,
                        xpReward: BADGES[roleKey].xpReward
                    });
                    console.log(`✅ Awarded ${roleKey} badge to user ${userId}`);
                }
            }
        }

    } catch (error) {
        console.error('Error awarding role badges:', error);
    }
};

// Initialize badges for existing users
exports.initializeUserBadges = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // Check and award all applicable badges
        await exports.checkAndAwardRoleBadges(userId, user.xp || 0);

        // Check quest completion badges
        const completedQuestsCount = user.completedQuests?.length || 0;
        const questBadges = [
            { count: 5, type: 'quest_5' },
            { count: 10, type: 'quest_10' },
            { count: 25, type: 'quest_25' },
            { count: 50, type: 'quest_50' }
        ];

        for (const badge of questBadges) {
            if (completedQuestsCount >= badge.count) {
                const existingBadge = await Badge.findOne({ userId, badgeType: badge.type });
                if (!existingBadge && BADGES[badge.type]) {
                    await Badge.create({
                        userId,
                        badgeType: badge.type,
                        name: BADGES[badge.type].name,
                        description: BADGES[badge.type].description,
                        icon: BADGES[badge.type].icon,
                        color: BADGES[badge.type].color,
                        xpReward: BADGES[badge.type].xpReward
                    });
                }
            }
        }

        // Check referral badges
        const referralCount = user.referredUsers?.length || 0;
        const referralBadges = [
            { count: 5, type: 'referral_5' },
            { count: 10, type: 'referral_10' },
            { count: 25, type: 'referral_25' }
        ];

        for (const badge of referralBadges) {
            if (referralCount >= badge.count) {
                const existingBadge = await Badge.findOne({ userId, badgeType: badge.type });
                if (!existingBadge && BADGES[badge.type]) {
                    await Badge.create({
                        userId,
                        badgeType: badge.type,
                        name: BADGES[badge.type].name,
                        description: BADGES[badge.type].description,
                        icon: BADGES[badge.type].icon,
                        color: BADGES[badge.type].color,
                        xpReward: BADGES[badge.type].xpReward
                    });
                }
            }
        }

        // Award first quest badge if they have any completed quests
        if (completedQuestsCount > 0) {
            const existingBadge = await Badge.findOne({ userId, badgeType: 'first_quest' });
            if (!existingBadge && BADGES['first_quest']) {
                await Badge.create({
                    userId,
                    badgeType: 'first_quest',
                    name: BADGES['first_quest'].name,
                    description: BADGES['first_quest'].description,
                    icon: BADGES['first_quest'].icon,
                    color: BADGES['first_quest'].color,
                    xpReward: BADGES['first_quest'].xpReward
                });
            }
        }

        // Check streak badges
        const streak = await Streak.findOne({ userId });
        if (streak) {
            const streakBadges = [
                { days: 7, type: 'streak_7' },
                { days: 30, type: 'streak_30' },
                { days: 100, type: 'streak_100' }
            ];

            for (const badge of streakBadges) {
                if (streak.longestStreak >= badge.days) {
                    const existingBadge = await Badge.findOne({ userId, badgeType: badge.type });
                    if (!existingBadge && BADGES[badge.type]) {
                        await Badge.create({
                            userId,
                            badgeType: badge.type,
                            name: BADGES[badge.type].name,
                            description: BADGES[badge.type].description,
                            icon: BADGES[badge.type].icon,
                            color: BADGES[badge.type].color,
                            xpReward: BADGES[badge.type].xpReward
                        });
                    }
                }
            }
        }

        console.log(`✅ Initialized badges for user ${userId}`);
    } catch (error) {
        console.error('Error initializing user badges:', error);
    }
};

// Search Challenge Leaderboard
exports.searchChallengeLeaderboard = async (req, res) => {
    try {
        const userId = req.user._id;
        const query = (req.query.q || '').toLowerCase().trim();

        if (!query || query.length < 2) {
            return res.json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        let orderedLeaderboard;

        // When challenge is locked, reuse the shared cache so search ranks
        // match exactly what is displayed on the leaderboard
        if (CHALLENGE_LOCKED && leaderboardCache) {
            orderedLeaderboard = leaderboardCache.map(p => ({
                ...p,
                isCurrentUser: p.odUserId === userId.toString()
            }));
        } else {
            // Challenge still live — build fresh from DB
            const challengeStartDate = new Date('2026-02-01');
            challengeStartDate.setHours(0, 0, 0, 0);
            const challengeEndDate = new Date('2026-03-02');
            challengeEndDate.setHours(23, 59, 59, 999);

            const allStreaks = await Streak.find({ totalLogins: { $gt: 0 } }).populate('userId', 'username');

            orderedLeaderboard = allStreaks
                .filter(s => s.userId && s.streakHistory && s.streakHistory.length > 0)
                .map(s => {
                    const challengeCheckins = s.streakHistory.filter(h => {
                        const checkDate = new Date(h.date);
                        const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
                        return checkDateOnly >= challengeStartDate && checkDateOnly <= challengeEndDate;
                    });

                    let challengeStreak = 0;
                    if (challengeCheckins.length > 0) {
                        const sortedCheckins = [...challengeCheckins].sort((a, b) => new Date(a.date) - new Date(b.date));
                        let expectedDate = new Date(sortedCheckins[0].date);
                        expectedDate = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());
                        for (const checkin of sortedCheckins) {
                            const checkinDateOnly = new Date(checkin.date);
                            checkinDateOnly.setHours(0, 0, 0, 0);
                            if (checkinDateOnly.getTime() === expectedDate.getTime()) {
                                challengeStreak++;
                                expectedDate.setDate(expectedDate.getDate() + 1);
                            } else if (checkinDateOnly > expectedDate) {
                                challengeStreak = 1;
                                expectedDate = new Date(checkinDateOnly);
                                expectedDate.setDate(expectedDate.getDate() + 1);
                            }
                        }
                    }

                    let avgHour = null;
                    if (challengeCheckins.length > 0) {
                        const totalHours = challengeCheckins.reduce((sum, h) => sum + new Date(h.date).getHours(), 0);
                        avgHour = Math.round(totalHours / challengeCheckins.length);
                    }

                    const firstCheckin = challengeCheckins.length > 0
                        ? new Date(Math.min(...challengeCheckins.map(c => new Date(c.date).getTime())))
                        : null;

                    return {
                        username: s.userId.username,
                        odUserId: s.userId._id.toString(),
                        challengeStreak,
                        totalCheckins: challengeCheckins.length,
                        avgCheckInTime: avgHour !== null ? `${String(avgHour).padStart(2, '0')}:00` : null,
                        avgHour,
                        firstCheckin,
                        isCurrentUser: s.userId._id.toString() === userId.toString()
                    };
                })
                .filter(p => p.totalCheckins > 0)
                .sort((a, b) => {
                    if (b.totalCheckins !== a.totalCheckins) return b.totalCheckins - a.totalCheckins;
                    if (b.challengeStreak !== a.challengeStreak) return b.challengeStreak - a.challengeStreak;
                    if (a.avgHour !== null && b.avgHour !== null && a.avgHour !== b.avgHour) return a.avgHour - b.avgHour;
                    if (a.firstCheckin && b.firstCheckin) return a.firstCheckin - b.firstCheckin;
                    return 0;
                });
        }

        const results = orderedLeaderboard
            .map((p, index) => ({ ...p, rank: index + 1 }))
            .filter(p => p.username.toLowerCase().includes(query))
            .slice(0, 10);

        res.json({
            success: true,
            results,
            total: orderedLeaderboard.length
        });

    } catch (error) {
        console.error('Error searching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Failed to search leaderboard' });
    }
};

// Export getUserRole for use in other controllers
exports.getUserRole = getUserRole;

module.exports = exports;
