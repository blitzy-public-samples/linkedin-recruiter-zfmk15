// External imports with versions
import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.9.0
import cache from 'express-cache-middleware'; // v1.0.0
import helmet from 'helmet'; // v7.0.0

// Internal imports
import { healthController } from '../controllers/health.controller';
import { loggerInstance as logger } from '../utils/logger';

// Constants for route configuration
const HEALTH_BASE_PATH = '/health';
const LIVENESS_PATH = '/live';
const READINESS_PATH = '/ready';
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Configures and returns an Express router with enhanced health check endpoints
 * including security, caching, and monitoring features
 */
const configureHealthRoutes = (): Router => {
  const router = Router();

  // Configure rate limiting for health check endpoints
  const healthRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.security('Rate limit exceeded for health check endpoint', 'WARN', {
        requestId: req.headers['x-request-id'] as string,
        correlationId: req.headers['x-correlation-id'] as string,
        userId: 'system',
        clientIp: req.ip,
        userAgent: req.headers['user-agent'] as string,
        action: 'RATE_LIMIT_EXCEEDED',
        resourceType: 'health_check',
        resourceId: 'api-gateway',
        securityLevel: 'WARN',
        containsPII: false
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many requests'
      });
    }
  });

  // Configure caching for non-critical health checks
  const cacheMiddleware = cache({
    duration: CACHE_DURATION,
    cacheKeyPrefix: 'health:',
    onlyStatus: [200],
    hydrate: (req, res) => {
      res.setHeader('X-Cache-Hit', 'true');
    }
  });

  // Security headers middleware
  router.use(helmet({
    hidePoweredBy: true,
    hsts: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }));

  // Logging middleware for all health routes
  router.use(HEALTH_BASE_PATH, (req, res, next) => {
    logger.info('Health check request received', {
      requestId: req.headers['x-request-id'],
      correlationId: req.headers['x-correlation-id'],
      path: req.path,
      method: req.method,
      clientIp: req.ip,
      userAgent: req.headers['user-agent']
    });
    next();
  });

  // General health check endpoint with caching and rate limiting
  router.get(
    HEALTH_BASE_PATH,
    healthRateLimiter,
    cacheMiddleware,
    healthController.checkHealth.bind(healthController)
  );

  // Kubernetes liveness probe endpoint - no caching, minimal rate limiting
  router.get(
    `${HEALTH_BASE_PATH}${LIVENESS_PATH}`,
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX_REQUESTS * 2 // Higher limit for k8s probes
    }),
    healthController.checkLiveness.bind(healthController)
  );

  // Kubernetes readiness probe endpoint - no caching, minimal rate limiting
  router.get(
    `${HEALTH_BASE_PATH}${READINESS_PATH}`,
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX_REQUESTS * 2 // Higher limit for k8s probes
    }),
    healthController.checkReadiness.bind(healthController)
  );

  // Error handling middleware
  router.use((err: Error, req: any, res: any, next: any) => {
    logger.error('Health check error', err, {
      requestId: req.headers['x-request-id'],
      correlationId: req.headers['x-correlation-id'],
      userId: 'system',
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'HEALTH_CHECK_ERROR',
      resourceType: 'health_check',
      resourceId: 'api-gateway',
      securityLevel: 'ERROR',
      containsPII: false
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal server error during health check'
    });
  });

  return router;
};

// Export configured health routes
export const healthRouter = configureHealthRoutes();