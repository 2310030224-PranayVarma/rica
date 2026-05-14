# RICA — Realtime Intelligent Chat Application

A scalable realtime chat application built with **React.js**, **Node.js**, **Express.js**, **MongoDB**, and **Socket.IO**.

## Project Overview

RICA provides secure JWT-based authentication and realtime chat with one-to-one and group conversations, online presence, typing indicators, delivery status updates, reconnect recovery, and paginated message history.

## Features

- JWT authentication (register/login)
- Password hashing with bcrypt
- One-to-one realtime messaging
- Group chat support
- Online/offline user tracking
- Typing indicators
- Message delivery status (`sent`, `delivered`, `read` ready)
- Reconnect recovery for missed messages
- Persistent chat history in MongoDB
- Paginated old message loading
- Responsive React UI

## System Architecture

```text
Frontend (React + Vite)
  ├─ Auth pages
  ├─ Sidebar + conversation view
  ├─ REST calls (Axios)
  └─ Socket.IO client
           │
           ▼
Backend (Express + Socket.IO)
  ├─ JWT auth middleware
  ├─ Auth & chat REST APIs
  ├─ Socket event handlers
  └─ MongoDB models (Mongoose)
           │
           ▼
MongoDB
  ├─ Users
  ├─ Conversations
  └─ Messages
```

## Realtime Communication Flow

1. Client authenticates with JWT and opens Socket.IO connection.
2. Client emits `user_connected` with last-received timestamp.
3. Server joins user to conversation rooms and sends `recover_messages` when needed.
4. Sender emits `send_message`.
5. Server persists message and emits `receive_message` to room.
6. Server emits `message_status` when recipient is online (`delivered`).
7. Typing events are broadcast with `typing_start` / `typing_stop`.
8. Presence is broadcast with `user_presence` and `user_disconnected`.

## JWT Authentication Flow

- `POST /api/auth/register` validates input, hashes password, creates user, returns token.
- `POST /api/auth/login` validates credentials and returns token.
- Protected routes require `Authorization: Bearer <token>`.
- Socket auth uses the same JWT in `auth.token`.

## MongoDB Schema Design

### Users
- `username`
- `email` (indexed, unique)
- `passwordHash`
- `isOnline`
- `lastSeen`
- `socketId`

### Conversations
- `type` (`direct` or `group`)
- `name` (for group)
- `members` (indexed array)
- `createdBy`
- timestamps

### Messages
- `senderId`
- `receiverId` / `conversationId`
- `message`
- `timestamp`
- `deliveryStatus`
- indexes on conversation/timestamp and sender/receiver

## Socket.IO Event Workflow

### Client → Server
- `user_connected`
- `send_message`
- `typing_start`
- `typing_stop`

### Server → Client
- `receive_message`
- `recover_messages`
- `message_status`
- `user_presence`
- `user_disconnected`

## API Documentation

### Auth
- `POST /api/auth/register`
  - body: `{ username, email, password }`
- `POST /api/auth/login`
  - body: `{ email, password }`

### Chat (Protected)
- `GET /api/chat/users?q=<query>`
- `POST /api/chat/conversations/direct`
  - body: `{ receiverId }`
- `POST /api/chat/conversations/group`
  - body: `{ name, memberIds[] }`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId/messages?page=1&limit=20`

## Setup Instructions

### 1) Clone and install

```bash
git clone https://github.com/2310030224-PranayVarma/rica.git
cd rica
npm install
npm install --workspace backend
npm install --workspace frontend
```

### 2) Configure backend env

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/rica
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3) Run backend

```bash
npm run dev:backend
```

### 4) Run frontend

```bash
npm run dev:frontend
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## Environment Variables

### Backend
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`

### Frontend (optional)
- `VITE_API_URL` (default `http://localhost:5000/api`)
- `VITE_SOCKET_URL` (default `http://localhost:5000`)

## Folder Structure

```text
rica/
├─ backend/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ models/
│  │  ├─ routes/
│  │  ├─ socket/
│  │  ├─ utils/
│  │  ├─ app.js
│  │  └─ server.js
│  └─ test/
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ utils/
│  │  ├─ App.jsx
│  │  └─ main.jsx
├─ docs/
│  └─ screenshots/
└─ README.md
```

## Security

- Password hashing with bcryptjs
- JWT-signed auth tokens
- Protected APIs with middleware
- Request input validation with express-validator
- Error handling middleware for safe API responses

## Future Scalability Improvements

- Redis adapter for Socket.IO horizontal scaling
- Kafka/RabbitMQ for event streaming
- Read receipts and end-to-end encryption
- Media attachments + object storage
- Rate-limiting and abuse protection
- Docker/Kubernetes deployment + observability

## Screenshots

- Login Page:
  - `docs/screenshots/login-page.png`

- Chat UI Placeholder:
  - `docs/screenshots/chat-page-placeholder.png` *(add after running with backend + DB)*
