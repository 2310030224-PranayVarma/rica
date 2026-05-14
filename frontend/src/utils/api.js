import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({ baseURL: API_URL });

export const setAuthToken = (token) => {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
};

export const authApi = {
  register: (payload) => client.post('/auth/register', payload),
  login: (payload) => client.post('/auth/login', payload)
};

export const chatApi = {
  users: (q) => client.get('/chat/users', { params: { q } }),
  conversations: () => client.get('/chat/conversations'),
  createDirectConversation: (receiverId) => client.post('/chat/conversations/direct', { receiverId }),
  createGroupConversation: (name, memberIds) =>
    client.post('/chat/conversations/group', { name, memberIds }),
  messages: (conversationId, page = 1, limit = 20) =>
    client.get(`/chat/conversations/${conversationId}/messages`, { params: { page, limit } })
};

export const socketBaseUrl = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');

export default client;
