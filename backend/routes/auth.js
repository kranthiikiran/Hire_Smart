const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyToken, hashPassword, verifyPassword } = require('../middleware/auth');
const { logger } = require('../middleware/logging');
const dataStore = require('../services/dataStore');
const Joi = require('joi');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('recruiter', 'candidate').default('candidate'),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  company: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const isMongoReady = () => process.env.MONGO_AVAILABLE === 'true' && mongoose.connection.readyState === 1;

const normalizeUserRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'employer' ? 'recruiter' : normalized || 'candidate';
};

const toSafeFallbackUser = (user) => {
  if (!user) {
    return null;
  }

  const safeUser = { ...user };
  delete safeUser.password_hash;
  delete safeUser.refreshToken;
  delete safeUser.passwordHash;
  delete safeUser.__v;
  return safeUser;
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const email = String(value.email || '').trim().toLowerCase();
    const { password, role, firstName, lastName, company } = value;

    if (isMongoReady()) {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user (password will be hashed by pre-save middleware)
      const user = new User({
        email,
        password,
        role,
        firstName,
        lastName,
        company
      });

      await user.save();

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token
      user.refreshToken = refreshToken;
      await user.save();

      logger.info(`New user registered: ${email} (${role})`);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: user.toSafeObject(),
        accessToken,
        refreshToken
      });
    }

    const existingUser = dataStore.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const timestamp = new Date().toISOString();
    const fallbackUser = dataStore.createUser({
      id: userId,
      email,
      password_hash: passwordHash,
      role: normalizeUserRole(role),
      firstName,
      lastName,
      company,
      refreshToken: null,
      lastLogin: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const accessToken = generateAccessToken({
      id: fallbackUser.id,
      email: fallbackUser.email,
      role: fallbackUser.role
    });
    const refreshToken = generateRefreshToken({ id: fallbackUser.id });

    dataStore.updateUserById(fallbackUser.id, { refreshToken });

    logger.info(`New user registered: ${email} (${fallbackUser.role})`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: toSafeFallbackUser(fallbackUser),
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const email = String(value.email || '').trim().toLowerCase();
    const password = String(value.password || '');

    if (isMongoReady()) {
      // Find user and include password field.
      // Fallback to case-insensitive lookup for legacy records.
      let user = await User.findOne({ email }).select('+password');
      if (!user) {
        user = await User.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }).select('+password');
      }
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Verify password. Legacy records can have missing or malformed hashes,
      // which should behave like an auth failure instead of a server error.
      let isPasswordValid = false;
      try {
        isPasswordValid = await user.comparePassword(password);
      } catch (compareError) {
        logger.warn(`Password verification failed for ${email}: ${compareError.message}`);
        isPasswordValid = false;
      }
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token and update last login without mutating other fields.
      const lastLogin = new Date();
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            refreshToken,
            lastLogin
          }
        }
      );
      user.refreshToken = refreshToken;
      user.lastLogin = lastLogin;

      logger.info(`User logged in: ${email}`);

      return res.json({
        success: true,
        message: 'Login successful',
        user: user.toSafeObject(),
        accessToken,
        refreshToken
      });
    }

    const user = dataStore.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await verifyPassword(password, user.password_hash);
    } catch (compareError) {
      logger.warn(`Password verification failed for ${email}: ${compareError.message}`);
      isPasswordValid = false;
    }
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: normalizeUserRole(user.role)
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    dataStore.updateUserById(user.id, {
      refreshToken,
      lastLogin: new Date().toISOString()
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: toSafeFallbackUser(user),
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    if (isMongoReady()) {
      // Find user and verify refresh token matches
      const user = await User.findById(decoded.id).select('+refreshToken');
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user);

      return res.json({
        success: true,
        accessToken: newAccessToken
      });
    }

    const user = dataStore.findUserById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: normalizeUserRole(user.role)
    });

    return res.json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;

    if (userId) {
      if (isMongoReady()) {
        // Clear refresh token from database
        await User.findByIdAndUpdate(userId, { refreshToken: null });
      } else {
        dataStore.updateUserById(userId, { refreshToken: null });
      }
      logger.info(`User logged out: ${userId}`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Get current user (protected route example)
router.get('/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (isMongoReady()) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.json({
        success: true,
        user: user.toSafeObject()
      });
    }

    const user = dataStore.findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: toSafeFallbackUser(user)
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
