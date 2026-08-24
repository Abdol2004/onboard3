const User = require('../models/User');

// Middleware to check if user is authenticated
const authenticateUser = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/auth');
        }

        const user = await User.findById(req.session.userId);

        if (!user) {
            req.session.destroy();
            return res.redirect('/auth');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.redirect('/auth');
    }
};

// Middleware to check if user has specific role
const requireRole = (roleKey) => {
    return async (req, res, next) => {
        try {
            const { ROLES } = require('../config/gamification');
            const user = req.user || await User.findById(req.session.userId);

            if (!user) {
                return res.status(403).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Calculate user's current role
            let currentRole = 'citizen';
            for (const [key, roleData] of Object.entries(ROLES)) {
                if (roleData.special) continue;
                if (user.xp >= roleData.minXP && user.xp <= roleData.maxXP) {
                    currentRole = key;
                    break;
                }
            }

            // Get role hierarchy
            const roleKeys = Object.keys(ROLES).filter(k => !ROLES[k].special);
            const requiredRoleIndex = roleKeys.indexOf(roleKey);
            const currentRoleIndex = roleKeys.indexOf(currentRole);

            if (currentRoleIndex < requiredRoleIndex) {
                return res.status(403).json({
                    success: false,
                    message: `This feature requires ${ROLES[roleKey].name} role or higher`
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking user role'
            });
        }
    };
};

// Middleware to check if user has multiplayer access
const requireMultiplayerAccess = async (req, res, next) => {
    try {
        const { ROLES } = require('../config/gamification');
        const user = req.user || await User.findById(req.session.userId);

        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find user's current role
        let hasAccess = false;
        for (const [key, roleData] of Object.entries(ROLES)) {
            if (roleData.special) continue;
            if (user.xp >= roleData.minXP && user.xp <= roleData.maxXP) {
                hasAccess = roleData.benefits.multiplayerAccess;
                break;
            }
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Multiplayer access requires Contributor role or higher (500+ XP)'
            });
        }

        next();
    } catch (error) {
        console.error('Multiplayer access check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking multiplayer access'
        });
    }
};

module.exports = {
    authenticateUser,
    requireRole,
    requireMultiplayerAccess
};
