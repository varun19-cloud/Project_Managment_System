const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateFcmToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { registerValidation, loginValidation } = require('../validators/authValidators');

const router = express.Router();

// ─── Rate Limiter for sensitive auth endpoints ────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 auth attempts per window per IP
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Routes ────────────────────────────────────────────────────────────
// POST /api/auth/register  – Create new account
router.post('/register', authLimiter, registerValidation, register);

// POST /api/auth/login     – Authenticate and receive tokens
router.post('/login', authLimiter, loginValidation, login);

// POST /api/auth/refresh   – Get new access token using refresh token
router.post('/refresh', refreshToken);

// POST /api/auth/logout    – Revoke refresh token
router.post('/logout', logout);

// ─── Protected Routes (require valid JWT) ────────────────────────────────────
// GET  /api/auth/me         – Get current user profile
router.get('/me', protect, getMe);

// PUT  /api/auth/me/fcm-token – Update FCM token for push notifications
router.put('/me/fcm-token', protect, updateFcmToken);

module.exports = router;
