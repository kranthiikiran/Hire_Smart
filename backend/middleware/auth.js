const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'hiresmart-super-secret-key-change-in-production';
const JWT_EXPIRE = '1h';
const REFRESH_TOKEN_EXPIRE = '30d';

// Generate Access Token
const generateAccessToken = (userOrId, email, role) => {
  const payload =
    typeof userOrId === 'object' && userOrId !== null
      ? {
          id: userOrId.id,
          email: userOrId.email,
          role: userOrId.role || 'candidate'
        }
      : {
          id: userOrId,
          email,
          role: role || 'candidate'
        };

  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// Generate Refresh Token
const generateRefreshToken = (userOrId) => {
  const userId = typeof userOrId === 'object' && userOrId !== null ? userOrId.id : userOrId;

  return jwt.sign(
    {
      id: userId,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRE }
  );
};

// Verify Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};

// Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
};

// Authorization Middleware (Role-based)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_role: allowedRoles,
        your_role: req.user.role
      });
    }

    next();
  };
};

// Password Hashing
const hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Password Verification
const verifyPassword = async (inputPassword, storedHash) => {
  return bcrypt.compare(inputPassword, storedHash);
};

module.exports = {
  authenticate,
  authorize,
  generateAccessToken,
  generateRefreshToken,
  verifyPassword,
  hashPassword,
  JWT_SECRET
};
