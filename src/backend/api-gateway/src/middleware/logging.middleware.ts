// External imports with versions
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Internal imports
import logger from '../utils/logger';

// Constants for security headers monitoring
const SECURITY_HEADERS = [
  'authorization',
  'x-api-key',
  'x-forwarded-for',
  'x-real-ip',
  'user-agent',
  'origin',
  'referer'
];

// PII patterns for masking sensitive data
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g
};

// Interface for extended request with tracking data
interface RequestWithId extends Request {
  id: string;
  userId?: string;
  startTime: number;
  securityContext: {
    clientIp: string;
    userAgent: string;
    origin: string;
    securityHeaders: Record<string, string>;
  };
  performanceMetrics: {
    startTime: number;
    endTime?: number;
    duration?: number;
    responseSize?: number;
  };
}

/**
 * Express middleware for comprehensive request/response logging with security
 * audit, performance monitoring, and compliance tracking capabilities
 */
const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Cast request to extended interface
  const request = req as RequestWithId;
  
  // Generate unique request ID and set correlation headers
  request.id = uuidv4();
  request.startTime = Date.now();
  res.setHeader('x-request-id', request.id);
  res.setHeader('x-correlation-id', request.id);

  // Initialize security context
  request.securityContext = {
    clientIp: req.ip || req.socket.remoteAddress || '',
    userAgent: req.get('user-agent') || '',
    origin: req.get('origin') || '',
    securityHeaders: {}
  };

  // Collect and monitor security headers
  SECURITY_HEADERS.forEach(header => {
    const value = req.get(header);
    if (value) {
      request.securityContext.securityHeaders[header] = header.includes('authorization') 
        ? '[REDACTED]' 
        : value;
    }
  });

  // Initialize performance metrics
  request.performanceMetrics = {
    startTime: Date.now()
  };

  // Extract user context if authenticated
  if (req.headers.authorization) {
    try {
      // Assuming JWT token in Authorization header
      const token = req.headers.authorization.split(' ')[1];
      // Note: Actual token decoding would happen here
      request.userId = '[EXTRACTED_FROM_TOKEN]';
    } catch (error) {
      logger.error('Failed to extract user context', error as Error, {
        requestId: request.id,
        correlationId: request.id,
        userId: 'anonymous',
        clientIp: request.securityContext.clientIp,
        userAgent: request.securityContext.userAgent,
        action: 'USER_CONTEXT_EXTRACTION',
        resourceType: 'AUTH_TOKEN',
        resourceId: 'N/A',
        securityLevel: 'HIGH',
        containsPII: false
      });
    }
  }

  // Log sanitized request details
  logger.info('Incoming request', {
    requestId: request.id,
    correlationId: request.id,
    userId: request.userId || 'anonymous',
    method: req.method,
    url: req.url,
    query: maskSensitiveData(req.query),
    headers: request.securityContext.securityHeaders,
    clientIp: request.securityContext.clientIp,
    userAgent: request.securityContext.userAgent,
    timestamp: new Date().toISOString()
  });

  // Override response.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: string | (() => void), cb?: () => void): Response {
    request.performanceMetrics.endTime = Date.now();
    request.performanceMetrics.duration = 
      request.performanceMetrics.endTime - request.performanceMetrics.startTime;
    request.performanceMetrics.responseSize = Number(res.get('content-length')) || 0;

    // Log response details
    logger.info('Outgoing response', {
      requestId: request.id,
      correlationId: request.id,
      userId: request.userId || 'anonymous',
      statusCode: res.statusCode,
      responseTime: request.performanceMetrics.duration,
      responseSize: request.performanceMetrics.responseSize,
      headers: res.getHeaders(),
      timestamp: new Date().toISOString()
    });

    // Audit log for specific status codes
    if (res.statusCode >= 400) {
      logger.audit('Request failed', {
        requestId: request.id,
        correlationId: request.id,
        userId: request.userId || 'anonymous',
        clientIp: request.securityContext.clientIp,
        userAgent: request.securityContext.userAgent,
        action: 'REQUEST_FAILED',
        resourceType: 'HTTP_REQUEST',
        resourceId: request.id,
        securityLevel: res.statusCode >= 500 ? 'HIGH' : 'MEDIUM',
        containsPII: false
      }, {
        statusCode: res.statusCode,
        method: req.method,
        url: req.url,
        duration: request.performanceMetrics.duration
      });
    }

    return originalEnd.call(this, chunk, encoding as string, cb);
  };

  next();
};

/**
 * Utility function to mask sensitive data in request/response
 */
const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  
  let maskedData = JSON.stringify(data);
  Object.entries(PII_PATTERNS).forEach(([key, pattern]) => {
    maskedData = maskedData.replace(pattern, `[REDACTED_${key.toUpperCase()}]`);
  });

  return JSON.parse(maskedData);
};

export default loggingMiddleware;