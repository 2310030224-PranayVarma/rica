const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group'], required: true, default: 'direct' },
    name: { type: String, trim: true, maxlength: 100 },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1 });
conversationSchema.index({ type: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
