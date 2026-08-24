const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:        { type: String, enum: ['user', 'assistant', 'admin'], required: true },
  content:     { type: String, required: true },
  isComplaint: { type: Boolean, default: false },
  adminName:   { type: String }
}, { timestamps: true });

const chatConversationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages:       [messageSchema],
  hasComplaint:   { type: Boolean, default: false },
  status:         { type: String, enum: ['open', 'resolved'], default: 'open' },
  lastMessageAt:  { type: Date, default: Date.now },
  unreadByAdmin:  { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
