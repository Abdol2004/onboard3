const mongoose = require('mongoose');

const pathwayConfigSchema = new mongoose.Schema({
    pathway: {
        type: String,
        enum: ['web3_jobs', 'ai', 'nft', 'trading'],
        required: true,
        unique: true
    },
    name:        { type: String, default: '' },
    groupLink:   { type: String, default: null },  // Telegram group
    channelLink: { type: String, default: null },  // Telegram channel
    xLink:       { type: String, default: null },  // X community
    description: { type: String, default: '' },
    tagline:     { type: String, default: '' },
    leadUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    leadName:    { type: String, default: null },
    leadBio:     { type: String, default: '' },
    updatedAt:   { type: Date,   default: Date.now }
});

pathwayConfigSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('PathwayConfig', pathwayConfigSchema);
