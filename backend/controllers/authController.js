const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

// ─── Helper: Send token response ──────────────────────────────────────────────
const sendTokenResponse = (res, user, statusCode = 200) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Register a new user.
 * Validates input, checks for duplicate email, creates user, returns JWT.
 */
const register = async (req, res) => {
  try {
    // 1. Validate request body using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 3. Create new user (password hashing handled in pre-save hook)
    const user = await User.create({ name, email, password });

    logger.info(`New user registered: ${email}`);

    // 4. Return tokens
    return sendTokenResponse(res, user, 201);
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Login existing user.
 * Validates credentials, returns access + refresh tokens.
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Must explicitly select password since it's select: false
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Store refresh token in DB for this session
    const refreshToken = user.generateRefreshToken();
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${email}`);

    return res.status(200).json({
      success: true,
      accessToken: user.generateAccessToken(),
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
/**
 * Issue a new access token using a valid refresh token.
 * Implements refresh token rotation for enhanced security.
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Find user and check if this refresh token is stored
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === token);
    if (tokenIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked.',
      });
    }

    // Rotate: remove old refresh token, add new one
    user.refreshTokens.splice(tokenIndex, 1);
    const newRefreshToken = user.generateRefreshToken();
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      accessToken: user.generateAccessToken(),
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Could not refresh token.' });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * Logout user by revoking their specific refresh token from the DB.
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Verify and find user
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      // Even if token is invalid/expired, consider logout successful
      return res.status(200).json({ success: true, message: 'Logged out.' });
    }

    const user = await User.findById(decoded.id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== token);
      await user.save({ validateBeforeSave: false });
    }

    logger.info(`User logged out: ${decoded.id}`);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Get current authenticated user's profile.
 * Requires protect middleware.
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject ? req.user.toSafeObject() : req.user,
  });
};

// ─── PUT /api/auth/me/fcm-token ───────────────────────────────────────────────
/**
 * Update the user's FCM token for Firebase push notifications.
 */
const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM token is required.' });
    }

    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    return res.status(200).json({ success: true, message: 'FCM token updated.' });
  } catch (error) {
    logger.error('FCM token update error:', error);
    res.status(500).json({ success: false, message: 'Could not update FCM token.' });
  }
};

module.exports = { register, login, refreshToken, logout, getMe, updateFcmToken };
