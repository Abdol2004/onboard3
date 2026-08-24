const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:      { type: String, enum: ['quest','submission','event','badge','reward','referral','system','level_up','profile_view'], default: 'system' },
    title:     { type: String, required: true },
    message:   { type: String, required: true },
    icon:      { type: String, default: 'fa-bell' },       // FA icon class
    iconColor: { type: String, default: '#5EC213' },       // color
    link:      { type: String, default: null },             // optional click-through URL
    read:      { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

// Keep only the latest 50 notifications per user
notificationSchema.post('save', async function() {
    const count = await mongoose.model('Notification').countDocuments({ userId: this.userId });
    if (count > 50) {
        const oldest = await mongoose.model('Notification')
            .find({ userId: this.userId })
            .sort({ createdAt: 1 })
            .limit(count - 50)
            .select('_id');
        await mongoose.model('Notification').deleteMany({ _id: { $in: oldest.map(d => d._id) } });
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
