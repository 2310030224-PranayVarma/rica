const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

jest.mock('../src/models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../src/models/Conversation', () => ({
  findOne: jest.fn()
}));

jest.mock('../src/models/Message', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

describe('Message pagination API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated historical messages oldest-to-newest per page', async () => {
    const tokenUser = { _id: '507f1f77bcf86cd799439011', username: 'a', email: 'a@chat.com' };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(tokenUser) });
    Conversation.findOne.mockResolvedValue({ _id: 'c1' });

    const docs = [
      { _id: 'm15', message: 'msg-15', timestamp: new Date('2025-01-01T00:00:15.000Z') },
      { _id: 'm14', message: 'msg-14', timestamp: new Date('2025-01-01T00:00:14.000Z') },
      { _id: 'm13', message: 'msg-13', timestamp: new Date('2025-01-01T00:00:13.000Z') },
      { _id: 'm12', message: 'msg-12', timestamp: new Date('2025-01-01T00:00:12.000Z') },
      { _id: 'm11', message: 'msg-11', timestamp: new Date('2025-01-01T00:00:11.000Z') },
      { _id: 'm10', message: 'msg-10', timestamp: new Date('2025-01-01T00:00:10.000Z') },
      { _id: 'm9', message: 'msg-9', timestamp: new Date('2025-01-01T00:00:09.000Z') },
      { _id: 'm8', message: 'msg-8', timestamp: new Date('2025-01-01T00:00:08.000Z') },
      { _id: 'm7', message: 'msg-7', timestamp: new Date('2025-01-01T00:00:07.000Z') },
      { _id: 'm6', message: 'msg-6', timestamp: new Date('2025-01-01T00:00:06.000Z') }
    ];
    const queryChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(docs)
    };

    Message.find.mockReturnValue(queryChain);
    Message.countDocuments.mockResolvedValue(25);

    const token = jwt.sign({ userId: tokenUser._id }, process.env.JWT_SECRET || 'dev-secret');

    const response = await request(app)
      .get('/api/chat/conversations/507f1f77bcf86cd799439012/messages?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.messages).toHaveLength(10);
    expect(response.body.messages[0].message).toBe('msg-6');
    expect(response.body.messages[9].message).toBe('msg-15');
    expect(response.body.hasMore).toBe(true);
  });
});
