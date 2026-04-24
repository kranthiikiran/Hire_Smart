const winston = require('winston');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Morgan middleware for HTTP request logging
const httpLogger = morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: tokens.date(req, res, 'iso'),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    response_time: `${tokens['response-time'](req, res)}ms`,
    user_id: req.user?.id || 'anonymous',
    ip: tokens['remote-addr'](req, res)
  });
});

// Request ID middleware
const requestIdMiddleware = (req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  const requestId = uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Security Event Logger
const securityLogger = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  error: (message, meta = {}) => {
    logger.error(message, meta);
  },

  failedLogin: (email, ip) => {
    logger.warn('SECURITY_EVENT: Failed login', { email, ip });
  },

  accountLocked: (userId, duration) => {
    logger.warn('SECURITY_EVENT: Account locked', { userId, duration });
  },

  unauthorizedAccess: (userId, resource, reason) => {
    logger.warn('SECURITY_EVENT: Unauthorized access', { userId, resource, reason });
  },

  fileValidationFailed: (filename, reason) => {
    logger.warn('SECURITY_EVENT: File validation failed', { filename, reason });
  },

  rateLimitExceeded: (userId, limit) => {
    logger.warn('SECURITY_EVENT: Rate limit exceeded', { userId, limit });
  }
};

// Performance Logger
const performanceLogger = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  error: (message, meta = {}) => {
    logger.error(message, meta);
  },

  apiCall: (endpoint, method, duration, statusCode) => {
    logger.info('PERFORMANCE_API', {
      endpoint,
      method,
      duration_ms: duration,
      status_code: statusCode
    });
  },

  analysisComplete: (resumes_count, duration) => {
    logger.info('PERFORMANCE_ANALYSIS', {
      resumes_count,
      duration_ms: duration,
      throughput: Math.round((resumes_count / (duration / 1000)) * 100) / 100
    });
  }
};

module.exports = {
  logger,
  httpLogger,
  requestIdMiddleware,
  securityLogger,
  performanceLogger
};
