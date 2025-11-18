const CampusAmbassador = require('../models/CampusAmbassador');
const User = require('../models/User');

// Get user's ambassador application
exports.getMyApplication = async (req, res) => {
    try {
        const application = await CampusAmbassador.findOne({ 
            userId: req.session.userId 
        });
        
        res.json({ 
            success: true,
            application: application || null 
        });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch application' 
        });
    }
};

// Submit new application
exports.submitApplication = async (req, res) => {
    try {
        // Check if user already applied
        const existing = await CampusAmbassador.findOne({ 
            userId: req.session.userId 
        });
        
        if (existing) {
            return res.status(400).json({ 
                success: false,
                error: 'You have already submitted an application' 
            });
        }

        // Validate required fields
        const {
            fullName, email, phone, state, institutionType,
            institutionName, courseOfStudy, currentLevel,
            twitter, motivation, promotionPlan
        } = req.body;

        if (!fullName || !email || !phone || !state || !institutionType ||
            !institutionName || !courseOfStudy || !currentLevel ||
            !twitter || !motivation || !promotionPlan) {
            return res.status(400).json({
                success: false,
                error: 'All required fields must be filled'
            });
        }

        // Create application
        const application = new CampusAmbassador({
            userId: req.session.userId,
            fullName,
            email,
            phone,
            state,
            institutionType,
            institutionName,
            courseOfStudy,
            currentLevel,
            twitter,
            telegram: req.body.telegram || '',
            motivation,
            experience: req.body.experience || '',
            promotionPlan,
            status: 'pending'
        });

        await application.save();

        res.json({ 
            success: true,
            message: 'Application submitted successfully! We will review it soon.',
            application
        });
    } catch (error) {
        console.error('Submit application error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit application' 
        });
    }
};

// Get all applications (Admin only)
exports.getAllApplications = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};
        
        const applications = await CampusAmbassador.find(filter)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 });
        
        res.json({ 
            success: true,
            applications 
        });
    } catch (error) {
        console.error('Get all applications error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch applications' 
        });
    }
};

// Approve application (Admin only)
exports.approveApplication = async (req, res) => {
    try {
        const { id } = req.params;
        
        const application = await CampusAmbassador.findById(id);
        if (!application) {
            return res.status(404).json({ 
                success: false,
                error: 'Application not found' 
            });
        }

        await application.approve();
        
        res.json({ 
            success: true,
            message: 'Application approved successfully',
            application
        });
    } catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to approve application' 
        });
    }
};

// Reject application (Admin only)
exports.rejectApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        
        const application = await CampusAmbassador.findById(id);
        if (!application) {
            return res.status(404).json({ 
                success: false,
                error: 'Application not found' 
            });
        }

        await application.reject(adminNotes);
        
        res.json({ 
            success: true,
            message: 'Application rejected',
            application
        });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to reject application' 
        });
    }
};

// Update ambassador metrics (Admin only)
exports.updateMetrics = async (req, res) => {
    try {
        const { id } = req.params;
        const { eventsOrganized, studentsReferred, contentCreated } = req.body;
        
        const application = await CampusAmbassador.findByIdAndUpdate(
            id,
            { eventsOrganized, studentsReferred, contentCreated },
            { new: true }
        );
        
        if (!application) {
            return res.status(404).json({ 
                success: false,
                error: 'Ambassador not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Metrics updated successfully',
            application
        });
    } catch (error) {
        console.error('Update metrics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update metrics' 
        });
    }
};