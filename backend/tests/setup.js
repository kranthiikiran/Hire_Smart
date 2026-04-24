// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.NODE_ENV = 'test';

// Mock Redis operations
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    get: jest.fn((key, cb) => cb(null, null)),
    set: jest.fn((key, value, mode, ttl, cb) => cb(null, 'OK')),
    del: jest.fn((key, cb) => cb(null, 1)),
    expire: jest.fn((key, ttl, cb) => cb(null, 1)),
    incr: jest.fn((key, cb) => cb(null, 1)),
    flushdb: jest.fn((cb) => cb(null, 'OK')),
    ping: jest.fn((cb) => cb(null, 'PONG')),
    on: jest.fn(),
  }))
}));
