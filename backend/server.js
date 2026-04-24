require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import database connection
const { connectDB } = require('./config/database');

// Import middleware
const { logger } = require('./middleware/logging');

// Import services
const { initializeQueue, closeQueue } = require('./services/queueService');

// Import routes
const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5500;

// CORS configuration
const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:80'
];

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : defaultCorsOrigins;

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // During local development, allow localhost/127.0.0.1 on any port.
  return localhostOriginPattern.test(origin);
};

// ===== MIDDLEWARE SETUP =====

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? 15 : 50)),
  message: { success: false, message: 'Too many auth attempts, please try again later' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  },
  skip: (req) => req.url === '/api/health' // Skip logging health checks
}));

// Request ID for tracking
app.use((req, res, next) => {
  req.id = require('uuid').v4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ===== ROUTES =====

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
// Backward compatibility for older clients using /api/login, /api/register, etc.
app.use('/api', authRoutes);
app.use('/api/analyze', analyzeRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend-react', 'dist');
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.url
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    requestId: req.id
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===== SERVER INITIALIZATION =====

const startServer = async () => {
  try {
    logger.info('🚀 Starting HireSmart AI Resume Screening System...');
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to MongoDB
    logger.info('📊 Connecting to MongoDB...');
    const dbConnection = await connectDB();
    if (dbConnection) {
      logger.info('✅ MongoDB connected successfully');
    } else {
      logger.warn('⚠️  MongoDB connection failed - using fallback storage');
    }
    
    // Initialize Bull queue (with Redis if available)
    logger.info('🎯 Initializing job queue...');
    await initializeQueue();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info('');
      logger.info('═══════════════════════════════════════════════════════════════');
      logger.info(`✨ HireSmart Backend Server Running`);
      logger.info(`🌐 Server URL: http://localhost:${PORT}`);
      logger.info(`📍 API Base: http://localhost:${PORT}/api`);
      logger.info(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      logger.info(`🤖 AI Analysis: http://localhost:${PORT}/api/analyze`);
      logger.info('═══════════════════════════════════════════════════════════════');
      logger.info('');
      logger.info('✅ Server is ready to accept connections');
      logger.info('');
      logger.info('📚 Documentation:');
      logger.info('   - API Docs: See COMPLETE_SYSTEM_README.md');
      logger.info('   - Workflow: See DETAILED_WORKFLOW.txt');
      logger.info('');
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('✅ HTTP server closed');
        
        // Close queue
        await closeQueue();
        logger.info('✅ Queue closed');
        
        // Close database connection
        if (dbConnection) {
          await dbConnection.close();
          logger.info('✅ Database connection closed');
        }
        
        logger.info('👋 Server shut down successfully');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Promise Rejection:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
