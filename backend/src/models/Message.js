const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now, index: true },
    deliveryStatus: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent', index: true }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
