const mongoose = require('mongoose');

const pathwayCommentSchema = new mongoose.Schema({
    contentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'PathwayContent', required: true },
    pathway:        { type: String, required: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username:       { type: String, required: true },
    profilePicture: { type: String, default: null },
    text:           { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });

pathwayCommentSchema.index({ contentId: 1, createdAt: 1 });

module.exports = mongoose.model('PathwayComment', pathwayCommentSchema);
