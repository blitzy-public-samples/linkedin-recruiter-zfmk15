// External imports with versions
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import Joi from 'joi'; // v17.9.2

// Internal imports
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { LoginRequest, UserRole } from '../types/auth.types';

// Constants for validation configuration
const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB
const VALIDATION_CACHE_SIZE = 1000;
const VALIDATION_CACHE_TTL = 300000; // 5 minutes

// PII detection patterns
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
  creditCard: /\b\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}\b/g
};

// XSS prevention patterns
const XSS_PATTERNS = {
  script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  events: /\bon\w+\s*=/gi,
  iframes: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
};

// Interface for validation schema configuration
interface ValidationSchema {
  schema: Joi.Schema;
  source: 'body' | 'query' | 'params';
  enablePiiDetection?: boolean;
  enableXssPrevention?: boolean;
  maxContentLength?: number;
}

// LRU Cache for validation results
const validationCache = new Map<string, { result: boolean; timestamp: number }>();

/**
 * Enhanced validation middleware factory with security features
 * @param schema Validation schema configuration
 * @returns Express middleware function
 */
const validateSchema = (schemaConfig: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate content length
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > (schemaConfig.maxContentLength || MAX_CONTENT_LENGTH)) {
        throw new ApiError(413, 'Payload too large', 'VALIDATION_ERROR', {
          maxSize: schemaConfig.maxContentLength || MAX_CONTENT_LENGTH
        }, 'HIGH');
      }

      // Get data from request based on source
      const data = req[schemaConfig.source];

      // Generate cache key
      const cacheKey = `${req.path}:${JSON.stringify(data)}`;

      // Check validation cache
      const cachedResult = validationCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < VALIDATION_CACHE_TTL) {
        if (!cachedResult.result) {
          throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
        }
        return next();
      }

      // XSS Prevention
      if (schemaConfig.enableXssPrevention) {
        const xssDetected = Object.values(XSS_PATTERNS).some(pattern => 
          pattern.test(JSON.stringify(data))
        );
        if (xssDetected) {
          logger.security('XSS attempt detected', 'HIGH', {
            requestId: req.id,
            correlationId: res.locals.correlationId,
            userId: (req as any).user?.id,
            clientIp: req.ip,
            userAgent: req.get('user-agent'),
            action: 'XSS_PREVENTION',
            resourceType: 'REQUEST_VALIDATION',
            resourceId: req.path,
            securityLevel: 'HIGH',
            containsPII: false,
            metadata: { path: req.path }
          });
          throw new ApiError(400, 'Invalid input detected', 'SECURITY_VIOLATION', 
            undefined, 'HIGH');
        }
      }

      // PII Detection
      if (schemaConfig.enablePiiDetection) {
        const piiDetected = Object.entries(PII_PATTERNS).some(([key, pattern]) => 
          pattern.test(JSON.stringify(data))
        );
        if (piiDetected) {
          logger.security('PII detected in request', 'MEDIUM', {
            requestId: req.id,
            correlationId: res.locals.correlationId,
            userId: (req as any).user?.id,
            clientIp: req.ip,
            userAgent: req.get('user-agent'),
            action: 'PII_DETECTION',
            resourceType: 'REQUEST_VALIDATION',
            resourceId: req.path,
            securityLevel: 'MEDIUM',
            containsPII: true
          });
        }
      }

      // Validate against schema
      const { error, value } = schemaConfig.schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        // Log validation failure
        logger.error('Validation failed', error, {
          requestId: req.id,
          correlationId: res.locals.correlationId,
          userId: (req as any).user?.id,
          clientIp: req.ip,
          userAgent: req.get('user-agent'),
          action: 'VALIDATION_FAILED',
          resourceType: 'REQUEST_VALIDATION',
          resourceId: req.path,
          securityLevel: 'MEDIUM',
          containsPII: false,
          metadata: { 
            errors: error.details.map(detail => detail.message)
          }
        });

        // Cache validation result
        validationCache.set(cacheKey, { result: false, timestamp: Date.now() });

        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', {
          errors: error.details.map(detail => detail.message)
        }, 'MEDIUM');
      }

      // Cache successful validation
      validationCache.set(cacheKey, { result: true, timestamp: Date.now() });

      // Update request with validated data
      req[schemaConfig.source] = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validation schemas with security rules
const loginSchema = Joi.object<LoginRequest>({
  email: Joi.string().email().required().max(255),
  password: Joi.string().required().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  mfaToken: Joi.string().length(6).pattern(/^\d+$/).optional()
});

const searchCriteriaSchema = Joi.object({
  keywords: Joi.string().max(500).required(),
  location: Joi.string().max(100).optional(),
  experience: Joi.array().items(Joi.string().valid('0-2', '3-5', '5+')).optional(),
  skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

const searchTemplateSchema = Joi.object({
  name: Joi.string().max(100).required(),
  criteria: Joi.object({
    keywords: Joi.string().max(500).required(),
    location: Joi.string().max(100).optional(),
    experience: Joi.array().items(Joi.string().valid('0-2', '3-5', '5+')).optional(),
    skills: Joi.array().items(Joi.string().max(50)).max(20).optional()
  }).required()
});

// Export validation middlewares with security enhancements
export const validateLoginRequest = validateSchema({
  schema: loginSchema,
  source: 'body',
  enablePiiDetection: true,
  enableXssPrevention: true,
  maxContentLength: 10 * 1024 // 10KB
});

export const validateSearchCriteria = validateSchema({
  schema: searchCriteriaSchema,
  source: 'body',
  enableXssPrevention: true,
  maxContentLength: 50 * 1024 // 50KB
});

export const validateSearchTemplate = validateSchema({
  schema: searchTemplateSchema,
  source: 'body',
  enableXssPrevention: true,
  maxContentLength: 50 * 1024 // 50KB
});