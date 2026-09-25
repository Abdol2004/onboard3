const mongoose = require('mongoose');

const pathwayConfigSchema = new mongoose.Schema({
    pathway: {
        type: String,
        enum: ['web3_jobs', 'ai', 'nft', 'trading'],
        required: true,
        unique: true
    },
    name:        { type: String, default: '' },
    groupLink:   { type: String, default: null },
    channelLink: { type: String, default: null },
    xLink:       { type: String, default: null },
    description: { type: String, default: '' },
    tagline:     { type: String, default: '' },

    // Multiple leads
    leads: [{
        userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        displayName: { type: String, default: '' },
        bio:         { type: String, default: '' },
        assignedAt:  { type: Date, default: Date.now }
    }],

    // Legacy single-lead fields (kept for backward compat, populated from leads[0])
    leadUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    leadName:   { type: String, default: null },
    leadBio:    { type: String, default: '' },

    updatedAt: { type: Date, default: Date.now }
});

pathwayConfigSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('PathwayConfig', pathwayConfigSchema);
