/**
 * API Gateway Application Entry Point
 * Implements comprehensive security, monitoring and performance features
 * 
 * @version 1.0.0
 * @license MIT
 */

// External imports with versions
import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { rateLimit } from 'express-rate-limit'; // v6.9.0
import morgan from 'morgan'; // v1.10.0
import { OpenApiValidator } from 'express-openapi-validator'; // v5.0.4
import swaggerUi from 'swagger-ui-express'; // v5.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Internal imports
import authRouter from './routes/auth.routes';
import searchRouter from './routes/search.routes';
import { healthRouter } from './routes/health.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { corsConfig } from './config/cors.config';
import { searchLimiter } from './config/rate-limit.config';
import logger from './utils/logger';

// Constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

// Initialize Express application
const app: Express = express();

/**
 * Initialize and configure middleware stack with security and monitoring features
 * @param app Express application instance
 */
const initializeMiddleware = (app: Express): void => {
  // Request correlation
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = req.headers['x-request-id'] as string || uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" }
  }));

  // CORS configuration
  app.use(cors(corsConfig));

  // Compression middleware
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024
  }));

  // Body parsing middleware with size limits
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Request logging
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));

  // API documentation
  if (NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
      swaggerOptions: {
        url: '/swagger.json',
        docExpansion: 'none'
      }
    }));
  }

  // OpenAPI validation
  app.use(new OpenApiValidator({
    apiSpec: './openapi.yaml',
    validateRequests: true,
    validateResponses: true,
    validateSecurity: {
      handlers: {
        ApiKeyAuth: async (req, scopes, schema) => {
          // Implement API key validation
          return true;
        }
      }
    }
  }).middleware());
};

/**
 * Initialize and configure application routes with security middleware
 * @param app Express application instance
 */
const initializeRoutes = (app: Express): void => {
  // Health check routes
  app.use('/health', healthRouter);

  // API routes with version prefix
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/search`, searchLimiter, searchRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);
};

/**
 * Start server with graceful shutdown support
 * @param app Express application instance
 */
const startServer = (app: Express): void => {
  const server = app.listen(PORT, () => {
    logger.info(`API Gateway started`, {
      port: PORT,
      environment: NODE_ENV,
      version: API_VERSION
    });
  });

  // Graceful shutdown handler
  const shutdown = async () => {
    logger.info('Received shutdown signal');

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    server.close(() => {
      logger.info('Closed out remaining connections');
      process.exit(0);
    });
  };

  // Shutdown signal handlers
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Rejection', reason, {
      stack: reason.stack
    });
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, {
      stack: error.stack
    });
    shutdown();
  });
};

// Initialize application
initializeMiddleware(app);
initializeRoutes(app);

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer(app);
}

// Export application instance for testing
export default app;