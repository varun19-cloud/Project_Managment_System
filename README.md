# Project Management System — Member 3: Auth, Real-Time & Visualizations

## Branch: `feature-auth`

This branch contains all contributions from **Member 3**, covering:

| Feature | Technology | Status |
|---|---|---|
| User Authentication (JWT) | Node.js, Express, JWT, bcryptjs | ✅ Complete |
| Refresh Token Rotation | JWT + MongoDB | ✅ Complete |
| Role-Based Access Control | Custom Middleware | ✅ Complete |
| Rate Limiting (Login/Register) | express-rate-limit | ✅ Complete |
| Real-Time Sync | Socket.IO | ✅ Complete |
| Push Notifications | Firebase Admin SDK (FCM) | ✅ Complete |
| Data Visualizations | Chart.js helpers | ✅ Complete |
| Unit Tests | Jest + Supertest | ✅ Complete |

---

## Folder Structure

```
backend/
├── controllers/
│   └── authController.js       # Register, Login, Refresh, Logout, /me
├── middleware/
│   └── authMiddleware.js       # protect, restrictTo, optionalAuth
├── models/
│   └── User.js                 # Mongoose schema with bcrypt + JWT methods
├── routes/
│   └── authRoutes.js           # Auth REST endpoints with rate limiting
├── services/
│   └── notificationService.js  # Firebase Admin SDK push notifications
├── sockets/
│   └── socketHandler.js        # Socket.IO JWT auth + real-time events
├── tests/
│   └── auth.test.js            # Jest + Supertest integration tests
├── utils/
│   └── logger.js               # Winston structured logger
├── validators/
│   └── authValidators.js       # express-validator input rules
├── .env.example                # Environment variable template
├── package.json
└── server.js                   # Express + Socket.IO app entry point

frontend/
└── src/
    └── utils/
        └── chartHelpers.js     # Chart.js dataset builders
```

---

## API Endpoints

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Create new account |
| POST | `/login` | ❌ | Login and receive tokens |
| POST | `/refresh` | ❌ | Rotate refresh token |
| POST | `/logout` | ❌ | Revoke refresh token |
| GET | `/me` | ✅ JWT | Get current user profile |
| PUT | `/me/fcm-token` | ✅ JWT | Update Firebase notification token |

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join:project` | `projectId` | Join a board room |
| `leave:project` | `projectId` | Leave a board room |
| `task:moved` | `{ projectId, taskId, fromStatus, toStatus }` | Broadcast task column change |
| `task:created` | `{ projectId, task }` | Broadcast new task |
| `task:deleted` | `{ projectId, taskId }` | Broadcast task deletion |
| `task:editing` | `{ projectId, taskId }` | Show live editing indicator |

### Server → Client
| Event | Description |
|---|---|
| `task:updated` | Another user moved a task |
| `task:new` | Another user created a task |
| `task:removed` | Another user deleted a task |
| `task:being-edited` | Another user is editing a task |
| `user:joined` | A user joined the board |
| `user:left` | A user left the board |

---

## Setup Instructions

```bash
cd backend
cp .env.example .env      # Fill in your secrets
npm install
npm run dev               # Start with nodemon
```

---

## Commit History (feature-auth branch)

1. `chore:` Initialize backend folder with package.json, .env.example, .gitignore
2. `feat(auth):` Add User model with bcrypt hashing and JWT token methods
3. `feat(auth):` Add JWT protect middleware with role-based access control
4. `feat(auth):` Implement register, login, refreshToken rotation, logout, getMe
5. `feat(auth):` Add express-validator rules and auth routes with rate limiting
6. `feat(realtime):` Integrate Socket.IO with JWT auth for live task board updates
7. `feat(notifications):` Integrate Firebase Admin SDK with multicast push notifications
8. `feat(server):` Wire up Express server with MongoDB, Socket.IO, Firebase, and auth routes
9. `test(auth):` Add Jest + Supertest integration tests for register, login, and /me
10. `docs:` Add comprehensive README for Member 3 feature-auth branch