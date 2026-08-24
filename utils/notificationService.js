const Notification = require('../models/Notification');
const User         = require('../models/User');

const ICONS = {
    quest:      { icon: 'fa-trophy',          color: '#5EC213' },
    submission: { icon: 'fa-paper-plane',     color: '#5EC213' },
    event:      { icon: 'fa-calendar-alt',    color: '#60a5fa' },
    badge:      { icon: 'fa-medal',           color: '#fbbf24' },
    reward:     { icon: 'fa-coins',           color: '#fbbf24' },
    referral:   { icon: 'fa-users',           color: '#c084fc' },
    level_up:   { icon: 'fa-ranking-star',    color: '#fbbf24' },
    system:     { icon: 'fa-bell',            color: '#8AAF85' }
};

/**
 * Create a single notification for one user.
 */
async function notify(userId, { type = 'system', title, message, link = null }) {
    try {
        const meta = ICONS[type] || ICONS.system;
        await Notification.create({
            userId, type, title, message, link,
            icon: meta.icon, iconColor: meta.color
        });
    } catch (err) {
        console.error('[Notify] Error creating notification:', err.message);
    }
}

/**
 * Broadcast to all users who have a specific notification preference enabled.
 * Capped at 2000 users to avoid DB overload.
 */
async function broadcast(prefKey, { type, title, message, link }) {
    try {
        const filter = { [`notifications.${prefKey}`]: { $ne: false } };
        const users = await User.find(filter).select('_id').limit(2000).lean();
        const meta  = ICONS[type] || ICONS.system;
        const docs  = users.map(u => ({
            userId: u._id, type, title, message, link,
            icon: meta.icon, iconColor: meta.color, read: false, createdAt: new Date()
        }));
        if (docs.length) await Notification.insertMany(docs, { ordered: false });
        console.log(`[Notify] Broadcast "${title}" to ${docs.length} users`);
    } catch (err) {
        console.error('[Notify] Broadcast error:', err.message);
    }
}

module.exports = { notify, broadcast };
