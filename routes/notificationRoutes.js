const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');

const isAuth = (req, res, next) => {
    if (req.session.userId) return next();
    res.status(401).json({ success: false, message: 'Unauthorized' });
};

// GET /api/notifications — fetch last 20
router.get('/', isAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        const unreadCount = await Notification.countDocuments({ userId: req.session.userId, read: false });
        res.json({ success: true, notifications, unreadCount });
    } catch (err) {
        res.json({ success: false, notifications: [], unreadCount: 0 });
    }
});

// GET /api/notifications/count — lightweight unread count poll
router.get('/count', isAuth, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ userId: req.session.userId, read: false });
        res.json({ success: true, count });
    } catch {
        res.json({ success: true, count: 0 });
    }
});

// POST /api/notifications/read-all
router.post('/read-all', isAuth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.session.userId, read: false }, { read: true });
        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
});

// POST /api/notifications/:id/read
router.post('/:id/read', isAuth, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.session.userId },
            { read: true }
        );
        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
});

// DELETE /api/notifications/clear
router.delete('/clear', isAuth, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.session.userId });
        res.json({ success: true });
    } catch {
        res.json({ success: false });
    }
});

module.exports = router;
