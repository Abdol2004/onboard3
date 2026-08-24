const mongoose = require('mongoose');

const projectSubmissionSchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['DeFi', 'NFT', 'DAO/Governance', 'Gaming', 'Infrastructure', 'Social', 'DePIN', 'AI/ML', 'Other']
    },
    description: {
        type: String,
        required: true
    },
    stage: {
        type: String,
        required: true,
        enum: ['Idea', 'In Development', 'Testnet', 'Mainnet', 'Live']
    },
    teamSize: {
        type: String,
        required: true
    },
    skillsNeeded: {
        type: String,
        required: true
    },
    website: {
        type: String,
        trim: true
    },
    contactEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    twitter: {
        type: String,
        trim: true
    },
    additionalInfo: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNotes: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
projectSubmissionSchema.index({ status: 1, submittedAt: -1 });
projectSubmissionSchema.index({ category: 1 });
projectSubmissionSchema.index({ contactEmail: 1 });

module.exports = mongoose.model('ProjectSubmission', projectSubmissionSchema);
