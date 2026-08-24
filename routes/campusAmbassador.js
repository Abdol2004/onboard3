const express = require('express');
const router = express.Router();
const campusAmbassadorController = require('../controllers/campusAmbassadorController');

// Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, error: 'Unauthorized' });
};

const isAdmin = (req, res, next) => {
    if (req.session.userId && req.session.isAdmin) {
        return next();
    }
    res.status(403).json({ success: false, error: 'Admin access required' });
};

// User routes
router.get('/my-application', isAuthenticated, campusAmbassadorController.getMyApplication);
router.post('/apply', isAuthenticated, campusAmbassadorController.submitApplication);

// Admin routes
router.get('/applications', isAuthenticated, isAdmin, campusAmbassadorController.getAllApplications);
router.post('/applications/:id/approve', isAuthenticated, isAdmin, campusAmbassadorController.approveApplication);
router.post('/applications/:id/reject', isAuthenticated, isAdmin, campusAmbassadorController.rejectApplication);
router.put('/applications/:id/metrics', isAuthenticated, isAdmin, campusAmbassadorController.updateMetrics);

module.exports = router;