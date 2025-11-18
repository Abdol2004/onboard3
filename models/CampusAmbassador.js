const mongoose = require('mongoose');

const campusAmbassadorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    institutionType: {
        type: String,
        required: true,
        enum: ['Federal University', 'State University', 'Private University', 'Polytechnic', 'College of Education']
    },
    institutionName: {
        type: String,
        required: true,
        trim: true
    },
    courseOfStudy: {
        type: String,
        required: true,
        trim: true
    },
    currentLevel: {
        type: String,
        required: true,
        enum: ['100', '200', '300', '400', '500', '600']
    },
    twitter: {
        type: String,
        required: true,
        trim: true
    },
    telegram: {
        type: String,
        trim: true,
        default: ''
    },
    motivation: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        default: ''
    },
    promotionPlan: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Ambassador performance metrics (filled after approval)
    eventsOrganized: {
        type: Number,
        default: 0
    },
    studentsReferred: {
        type: Number,
        default: 0
    },
    contentCreated: {
        type: Number,
        default: 0
    },
    // Admin notes
    adminNotes: {
        type: String,
        default: ''
    },
    approvedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for faster queries
campusAmbassadorSchema.index({ userId: 1 });
campusAmbassadorSchema.index({ status: 1 });
campusAmbassadorSchema.index({ state: 1, institutionName: 1 });

// Add campus ambassador role to user model when approved
campusAmbassadorSchema.methods.approve = async function() {
    this.status = 'approved';
    this.approvedAt = new Date();
    await this.save();
    
    // Update user's role or add ambassador flag
    await mongoose.model('User').findByIdAndUpdate(this.userId, {
        isCampusAmbassador: true,
        campusAmbassadorSince: new Date()
    });
};

// Remove campus ambassador role when rejected
campusAmbassadorSchema.methods.reject = async function(adminNotes = '') {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.adminNotes = adminNotes;
    await this.save();
    
    // Remove ambassador flag from user
    await mongoose.model('User').findByIdAndUpdate(this.userId, {
        isCampusAmbassador: false
    });
};

module.exports = mongoose.model('CampusAmbassador', campusAmbassadorSchema);