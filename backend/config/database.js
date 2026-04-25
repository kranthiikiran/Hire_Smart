const mongoose = require('mongoose');
const { logger } = require('../middleware/logging');

const buildMongoURI = () => {
  const {
    MONGODB_URI,
    MONGO_URI,
    MONGODB_URL,
    DATABASE_URL,
    MONGODB_HOST,
    MONGODB_DB,
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGODB_AUTH_SOURCE,
    MONGODB_URI_OPTIONS
  } = process.env;

  if (MONGODB_URI) {
    return { uri: MONGODB_URI, source: 'MONGODB_URI' };
  }

  if (MONGO_URI) {
    return { uri: MONGO_URI, source: 'MONGO_URI' };
  }

  if (MONGODB_URL) {
    return { uri: MONGODB_URL, source: 'MONGODB_URL' };
  }

  if (DATABASE_URL) {
    return { uri: DATABASE_URL, source: 'DATABASE_URL' };
  }

  if (MONGODB_HOST && MONGODB_USER && MONGODB_PASSWORD) {
    const host = MONGODB_HOST.replace(/^mongodb(\+srv)?:\/\//, '');
    const database = MONGODB_DB || 'hiresmart';
    const authSource = MONGODB_AUTH_SOURCE || 'admin';
    const uriOptions = MONGODB_URI_OPTIONS || 'retryWrites=true&w=majority';
    const username = encodeURIComponent(MONGODB_USER);
    const password = encodeURIComponent(MONGODB_PASSWORD);

    return {
      uri: `mongodb+srv://${username}:${password}@${host}/${database}?authSource=${authSource}&${uriOptions}`,
      source: 'MONGODB_HOST+MONGODB_USER+MONGODB_PASSWORD'
    };
  }

  return { uri: null, source: null };
};

const getMongoURIHost = (mongoURI) => {
  if (!mongoURI) return null;
  const cleaned = mongoURI.replace(/^mongodb(\+srv)?:\/\//, '');
  return cleaned.split('/')[0];
};

const connectDB = async () => {
  let mongoSource = 'unknown';

  try {
    const { uri: mongoURI, source } = buildMongoURI();
    mongoSource = source || mongoSource;

    if (!mongoURI) {
      throw new Error('MongoDB URI not configured. Set MONGODB_URI, MONGO_URI, MONGODB_URL, DATABASE_URL, or MONGODB_HOST + MONGODB_USER + MONGODB_PASSWORD.');
    }

    logger.info('Using MongoDB configuration source:', { source: mongoSource });

    // Common misconfiguration: unresolved placeholders in URI credentials.
    if (/[<>]/.test(mongoURI)) {
      throw new Error('MongoDB URI contains placeholder characters (< or >). Use actual credentials instead of placeholders.');
    }

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('✅ MongoDB connected successfully');
    logger.info(`📊 Database: ${mongoose.connection.name}`);
    process.env.MONGO_AVAILABLE = 'true';
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      process.env.MONGO_AVAILABLE = 'false';
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
      process.env.MONGO_AVAILABLE = 'false';
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
      process.env.MONGO_AVAILABLE = 'true';
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('❌ MongoDB connection failed', {
      message: error.message,
      stack: error.stack,
      host: getMongoURIHost(process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || process.env.DATABASE_URL),
      env_source: mongoSource
    });
    logger.error('MongoDB connection troubleshooting: verify URI credentials, URL-encode special password characters, ensure Render environment variables are set correctly, and allow Render outbound IP in MongoDB Atlas network access.');
    process.env.MONGO_AVAILABLE = 'false';
    // Don't exit process - allow fallback to JSON storage
    return null;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};

module.exports = { connectDB, disconnectDB };
