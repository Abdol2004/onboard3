const express = require('express');
const router = express.Router();
const ProjectSubmission = require('../models/ProjectSubmission');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'You must be logged in to submit a project'
    });
};

// POST /api/projects/submit - Submit a new project
router.post('/submit', async (req, res) => {
    try {
        const {
            projectName,
            category,
            description,
            stage,
            teamSize,
            skillsNeeded,
            website,
            contactEmail,
            twitter,
            additionalInfo
        } = req.body;

        // Validation
        if (!projectName || !category || !description || !stage || !teamSize || !skillsNeeded || !contactEmail) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Create new project submission
        const projectSubmission = new ProjectSubmission({
            projectName,
            category,
            description,
            stage,
            teamSize,
            skillsNeeded,
            website: website || undefined,
            contactEmail,
            twitter: twitter || undefined,
            additionalInfo: additionalInfo || undefined,
            submittedBy: req.session.userId || null,
            status: 'pending'
        });

        await projectSubmission.save();

        res.status(201).json({
            success: true,
            message: 'Project submitted successfully! We will review it and get back to you soon.',
            projectId: projectSubmission._id
        });

    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your project. Please try again.'
        });
    }
});

// GET /api/projects/submissions - Get all project submissions (admin only)
router.get('/submissions', isAuthenticated, async (req, res) => {
    try {
        // Check if user is admin (you may need to adjust this based on your user model)
        // For now, assuming there's an isAdmin field in session
        if (!req.session.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const { status, category, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;

        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            ProjectSubmission.find(query)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('submittedBy', 'username email')
                .populate('reviewedBy', 'username'),
            ProjectSubmission.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: submissions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching submissions'
        });
    }
});

// PUT /api/projects/submissions/:id/review - Review a project submission (admin only)
router.put('/submissions/:id/review', isAuthenticated, async (req, res) => {
    try {
        if (!req.session.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const { id } = req.params;
        const { status, reviewNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        const submission = await ProjectSubmission.findByIdAndUpdate(
            id,
            {
                status,
                reviewNotes: reviewNotes || undefined,
                reviewedBy: req.session.userId,
                reviewedAt: new Date()
            },
            { new: true }
        );

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Project submission not found'
            });
        }

        res.json({
            success: true,
            message: `Project ${status} successfully`,
            data: submission
        });

    } catch (error) {
        console.error('Error reviewing submission:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while reviewing the submission'
        });
    }
});

// GET /api/projects/approved - Get all approved projects (public)
router.get('/approved', async (req, res) => {
    try {
        const { category } = req.query;

        const query = { status: 'approved' };
        if (category) query.category = category;

        const projects = await ProjectSubmission.find(query)
            .sort({ reviewedAt: -1 })
            .select('-reviewNotes -submittedBy -reviewedBy');

        res.json({
            success: true,
            data: projects
        });

    } catch (error) {
        console.error('Error fetching approved projects:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching projects'
        });
    }
});

module.exports = router;
