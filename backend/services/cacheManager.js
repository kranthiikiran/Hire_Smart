const redis = require('redis');
const { promisify } = require('util');

class CacheManager {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.get = promisify(this.client.get).bind(this.client);
    this.set = promisify(this.client.set).bind(this.client);
    this.del = promisify(this.client.del).bind(this.client);
    this.expire = promisify(this.client.expire).bind(this.client);
    this.incr = promisify(this.client.incr).bind(this.client);
  }

  // Cache job descriptions (30 days)
  async cacheJobDescription(jobDescId, jobData) {
    const cacheKey = `job_desc:${jobDescId}`;
    const ttlSeconds = 30 * 24 * 60 * 60;

    await this.set(
      cacheKey,
      JSON.stringify(jobData),
      'EX',
      ttlSeconds
    );
  }

  async getJobDescription(jobDescId) {
    const cacheKey = `job_desc:${jobDescId}`;
    const cached = await this.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache analysis results (1 hour)
  async cacheAnalysisResult(analysisId, result) {
    const cacheKey = `analysis:${analysisId}`;
    const ttlSeconds = 60 * 60;

    await this.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      ttlSeconds
    );
  }

  async getAnalysisResult(analysisId) {
    const cacheKey = `analysis:${analysisId}`;
    const cached = await this.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // User sessions (30 days)
  async setUserSession(userId, sessionData) {
    const cacheKey = `session:${userId}`;
    const ttlSeconds = 30 * 24 * 60 * 60;

    await this.set(
      cacheKey,
      JSON.stringify(sessionData),
      'EX',
      ttlSeconds
    );
  }

  async getUserSession(userId) {
    const cacheKey = `session:${userId}`;
    const cached = await this.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // Rate limit tracking
  async incrementRateLimit(userId, limit = 100, windowSeconds = 900) {
    const key = `ratelimit:${userId}`;
    const current = await this.incr(key);

    if (current === 1) {
      await this.expire(key, windowSeconds);
    }

    return {
      current,
      limit,
      remaining: Math.max(0, limit - current)
    };
  }

  // Cache invalidation
  async invalidateJobDescription(jobDescId) {
    await this.del(`job_desc:${jobDescId}`);
  }

  async invalidateUserSession(userId) {
    await this.del(`session:${userId}`);
  }

  async clearAllCache() {
    return promisify(this.client.flushdb).bind(this.client)();
  }

  // Health check
  async ping() {
    return promisify(this.client.ping).bind(this.client)();
  }
}

module.exports = new CacheManager();
