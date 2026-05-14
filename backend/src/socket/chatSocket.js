const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const socketUsers = new Map();

const authenticateSocket = async (token) => {
  if (!token) {
    throw new Error('Unauthorized');
  }
  const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
};

const emitPresence = (io, userId, isOnline) => {
  io.emit('user_presence', {
    userId: String(userId),
    isOnline,
    lastSeen: new Date().toISOString()
  });
};

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const user = await authenticateSocket(token);
      socket.user = user;
      next();
    } catch (_error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.user._id);
    socketUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date()
    });

    const conversations = await Conversation.find({ members: socket.user._id }).select('_id members');
    conversations.forEach((conversation) => {
      socket.join(String(conversation._id));
    });

    emitPresence(io, userId, true);

    socket.on('user_connected', async ({ lastReceivedAt } = {}) => {
      if (!lastReceivedAt) {
        return;
      }
      const conversationIds = conversations.map((conversation) => conversation._id);
      const missedMessages = await Message.find({
        conversationId: { $in: conversationIds },
        timestamp: { $gt: new Date(lastReceivedAt) }
      })
        .sort({ timestamp: 1 })
        .limit(200)
        .lean();

      if (missedMessages.length) {
        socket.emit('recover_messages', missedMessages);
      }
    });

    socket.on('typing_start', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(String(conversationId)).emit('typing_start', {
        conversationId,
        userId,
        username: socket.user.username
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(String(conversationId)).emit('typing_stop', {
        conversationId,
        userId
      });
    });

    socket.on('send_message', async (payload, callback = () => {}) => {
      try {
        const { conversationId: existingConversationId, receiverId, message } = payload || {};

        if (!message || !String(message).trim()) {
          return callback({ ok: false, message: 'Message is required' });
        }

        let conversation = null;
        if (existingConversationId) {
          conversation = await Conversation.findOne({
            _id: existingConversationId,
            members: socket.user._id
          });
        } else if (receiverId) {
          conversation = await Conversation.findOne({
            type: 'direct',
            members: { $all: [socket.user._id, receiverId], $size: 2 }
          });
          if (!conversation) {
            conversation = await Conversation.create({
              type: 'direct',
              members: [socket.user._id, receiverId],
              createdBy: socket.user._id
            });
          }
          socket.join(String(conversation._id));
        }

        if (!conversation) {
          return callback({ ok: false, message: 'Conversation not found' });
        }

        const isGroup = conversation.type === 'group';
        const peerId = !isGroup
          ? String(conversation.members.find((member) => String(member) !== userId))
          : null;

        const savedMessage = await Message.create({
          conversationId: conversation._id,
          senderId: socket.user._id,
          receiverId: isGroup ? null : peerId,
          message: String(message).trim(),
          timestamp: new Date(),
          deliveryStatus: 'sent'
        });

        conversation.updatedAt = new Date();
        await conversation.save();

        const messagePayload = {
          _id: savedMessage._id,
          conversationId: savedMessage.conversationId,
          senderId: savedMessage.senderId,
          receiverId: savedMessage.receiverId,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
          deliveryStatus: savedMessage.deliveryStatus
        };

        io.to(String(conversation._id)).emit('receive_message', messagePayload);

        const recipients = conversation.members
          .map((member) => String(member))
          .filter((memberId) => memberId !== userId);
        const delivered = recipients.some((memberId) => socketUsers.has(memberId));

        if (delivered) {
          savedMessage.deliveryStatus = 'delivered';
          await savedMessage.save();
          io.to(String(conversation._id)).emit('message_status', {
            messageId: savedMessage._id,
            deliveryStatus: 'delivered'
          });
        }

        callback({ ok: true, message: messagePayload, conversationId: conversation._id });
      } catch (error) {
        callback({ ok: false, message: error.message });
      }
    });

    socket.on('disconnect', async () => {
      socketUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        socketId: null,
        lastSeen: new Date()
      });
      emitPresence(io, userId, false);
      socket.broadcast.emit('user_disconnected', {
        userId,
        lastSeen: new Date().toISOString()
      });
    });
  });
};

module.exports = { setupSocket, socketUsers };
