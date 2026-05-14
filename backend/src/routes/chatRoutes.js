const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const HttpError = require('../utils/httpError');

const router = express.Router();

router.use(authMiddleware);

router.get('/users', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          _id: { $ne: req.user._id },
          $or: [{ username: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]
        }
      : { _id: { $ne: req.user._id } };

    const users = await User.find(filter).select('_id username email isOnline lastSeen').limit(20);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/conversations/direct',
  [body('receiverId').isMongoId().withMessage('receiverId is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new HttpError(400, errors.array()[0].msg);
      }

      const { receiverId } = req.body;
      if (receiverId === String(req.user._id)) {
        throw new HttpError(400, 'Cannot create direct chat with self');
      }

      const receiverExists = await User.exists({ _id: receiverId });
      if (!receiverExists) {
        throw new HttpError(404, 'Receiver not found');
      }

      let conversation = await Conversation.findOne({
        type: 'direct',
        members: { $all: [req.user._id, receiverId], $size: 2 }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: 'direct',
          members: [req.user._id, receiverId],
          createdBy: req.user._id
        });
      }

      res.status(201).json({ conversation });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/conversations/group',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Group name must be at least 2 characters'),
    body('memberIds').isArray({ min: 2 }).withMessage('At least 2 members are required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new HttpError(400, errors.array()[0].msg);
      }

      const uniqueMembers = [...new Set(req.body.memberIds)].filter((id) => mongoose.Types.ObjectId.isValid(id));
      const members = [...new Set([String(req.user._id), ...uniqueMembers])];
      if (members.length < 3) {
        throw new HttpError(400, 'Group must contain at least 3 users including creator');
      }

      const conversation = await Conversation.create({
        type: 'group',
        name: req.body.name,
        members,
        createdBy: req.user._id
      });

      res.status(201).json({ conversation });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ members: req.user._id })
      .populate('members', '_id username email isOnline lastSeen')
      .sort({ updatedAt: -1 });

    const conversationIds = conversations.map((conversation) => conversation._id);
    const latestMessages = await Message.aggregate([
      { $match: { conversationId: { $in: conversationIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$conversationId',
          message: { $first: '$message' },
          timestamp: { $first: '$timestamp' },
          deliveryStatus: { $first: '$deliveryStatus' },
          senderId: { $first: '$senderId' }
        }
      }
    ]);

    const latestByConversation = latestMessages.reduce((acc, item) => {
      acc[String(item._id)] = item;
      return acc;
    }, {});

    const payload = conversations.map((conversation) => ({
      ...conversation.toObject(),
      latestMessage: latestByConversation[String(conversation._id)] || null
    }));

    res.json({ conversations: payload });
  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const conversation = await Conversation.findOne({ _id: conversationId, members: req.user._id });
    if (!conversation) {
      throw new HttpError(404, 'Conversation not found');
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({ conversationId });

    res.json({
      messages: messages.reverse(),
      page,
      limit,
      hasMore: page * limit < total,
      total
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
