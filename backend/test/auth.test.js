const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn()
}));

const User = require('../src/models/User');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers and logs in a user', async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      _id: 'u1',
      username: 'pranay',
      email: 'pranay@example.com',
      passwordHash: bcrypt.hashSync('strongpass', 10)
    });
    User.create.mockResolvedValue({
      _id: 'u1',
      username: 'pranay',
      email: 'pranay@example.com'
    });

    const register = await request(app).post('/api/auth/register').send({
      username: 'pranay',
      email: 'pranay@example.com',
      password: 'strongpass'
    });

    expect(register.statusCode).toBe(201);
    expect(register.body.token).toBeDefined();

    const login = await request(app).post('/api/auth/login').send({
      email: 'pranay@example.com',
      password: 'strongpass'
    });

    expect(login.statusCode).toBe(200);
    expect(login.body.token).toBeDefined();
  });
});
