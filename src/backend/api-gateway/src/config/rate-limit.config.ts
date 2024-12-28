/**
 * Rate Limiting Configuration for API Gateway
 * Implements distributed rate limiting using Redis for fair resource usage across API endpoints
 * 
 * @module config/rate-limit
 * @requires express-rate-limit@6.9.0
 * @requires rate-limit-redis@3.0.0
 * @requires ioredis@5.3.2
 */

import rateLimit from 'express-rate-limit'; // v6.9.0
import RedisStore from 'rate-limit-redis'; // v3.0.0
import Redis from 'ioredis'; // v5.3.2
import { Request } from 'express';

// Constants for rate limiting configuration
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const SEARCH_MAX_REQUESTS = 100;
const PROFILE_MAX_REQUESTS = 1000;
const ANALYSIS_MAX_REQUESTS = 500;
const EXPORT_MAX_REQUESTS = 50;

// Initialize Redis client with retry strategy
const redisClient = new Redis(process.env.REDIS_URL, {
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

// Initialize Redis store for distributed rate limiting
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'rate-limit:',
  resetExpiryOnChange: true,
  sendCommand: (...args: any[]) => redisClient.call(...args),
});

/**
 * Factory function to create rate limiter middleware with specific configuration
 * @param options Rate limiter configuration options
 * @returns Configured rate limiter middleware
 */
const createLimiter = (options: {
  max: number;
  windowMs?: number;
  message?: string;
  skipFunction?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || DEFAULT_WINDOW_MS,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    skip: options.skipFunction || ((req: Request) => false),
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    keyGenerator: (req) => {
      // Use API key or IP address as rate limit key
      return req.headers['x-api-key']?.toString() || req.ip;
    },
  });
};

// Export configured rate limiters for different endpoints
export const searchLimiter = createLimiter({
  max: SEARCH_MAX_REQUESTS,
  message: 'Search rate limit exceeded. Maximum 100 requests per hour allowed.',
  skipFunction: (req: Request) => req.headers['x-internal-request'] === 'true',
});

export const profileLimiter = createLimiter({
  max: PROFILE_MAX_REQUESTS,
  message: 'Profile rate limit exceeded. Maximum 1000 requests per hour allowed.',
  skipFunction: (req: Request) => req.headers['x-internal-request'] === 'true',
});

export const analysisLimiter = createLimiter({
  max: ANALYSIS_MAX_REQUESTS,
  message: 'Analysis rate limit exceeded. Maximum 500 requests per hour allowed.',
  skipFunction: (req: Request) => req.headers['x-internal-request'] === 'true',
});

export const exportLimiter = createLimiter({
  max: EXPORT_MAX_REQUESTS,
  message: 'Export rate limit exceeded. Maximum 50 requests per hour allowed.',
  skipFunction: (req: Request) => req.headers['x-internal-request'] === 'true',
});

// Error handling for Redis connection
redisClient.on('error', (err) => {
  console.error('Redis rate limit store error:', err);
  // Fallback to memory store if Redis is unavailable
  redisStore.resetStore();
});

redisClient.on('connect', () => {
  console.info('Redis rate limit store connected successfully');
});

// Cleanup on process termination
process.on('SIGTERM', async () => {
  await redisClient.quit();
});