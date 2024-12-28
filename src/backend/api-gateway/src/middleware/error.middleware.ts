// External imports with versions
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { StatusCodes } from 'http-status-codes'; // v2.2.0
import i18next from 'i18next'; // v23.2.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Internal imports
import { loggerInstance as logger } from '../utils/logger';

// Constants for error handling
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';
const DEFAULT_ERROR_CODE = 'INTERNAL_SERVER_ERROR';
const DEFAULT_SECURITY_LEVEL = 'LOW';
const ERROR_CACHE_TTL = 300000; // 5 minutes in milliseconds
const MAX_ERROR_STACK_LENGTH = 1000;

// PII detection patterns
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
  creditCard: /\b\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}\b/g
};

// Interface definitions
interface ErrorResponse {
  success: boolean;
  message: string;
  code: string;
  details?: any;
  timestamp: string;
  correlationId: string;
  traceId?: string;
  securityContext?: {
    level: string;
    containsPII: boolean;
    classification: string;
  };
}

interface SecurityContext {
  level: string;
  containsPII: boolean;
  classification: string;
  sourceIp?: string;
  userAgent?: string;
  userId?: string;
}

// Enhanced API Error class with security features
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly securityLevel: string;
  public readonly containsPII: boolean;
  public readonly correlationId: string;
  public readonly securityContext: SecurityContext;

  constructor(
    statusCode: number,
    message: string,
    code: string = DEFAULT_ERROR_CODE,
    details?: any,
    securityLevel: string = DEFAULT_SECURITY_LEVEL,
    containsPII: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.securityLevel = securityLevel;
    this.containsPII = containsPII;
    this.correlationId = uuidv4();
    this.securityContext = {
      level: securityLevel,
      containsPII: containsPII,
      classification: this.classifyError(statusCode)
    };

    Error.captureStackTrace(this, this.constructor);
    
    // Mask PII in error details if present
    if (containsPII && details) {
      this.details = this.maskPII(details);
    }
  }

  private classifyError(statusCode: number): string {
    if (statusCode >= 500) return 'SYSTEM';
    if (statusCode >= 400) return 'CLIENT';
    return 'UNKNOWN';
  }

  private maskPII(data: any): any {
    let maskedData = JSON.stringify(data);
    Object.entries(PII_PATTERNS).forEach(([key, pattern]) => {
      maskedData = maskedData.replace(pattern, `[REDACTED-${key}]`);
    });
    return JSON.parse(maskedData);
  }
}

// Enhanced error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate correlation ID for error tracking
  const correlationId = error instanceof ApiError ? 
    error.correlationId : 
    uuidv4();

  // Create security context
  const securityContext: SecurityContext = {
    level: error instanceof ApiError ? error.securityLevel : DEFAULT_SECURITY_LEVEL,
    containsPII: error instanceof ApiError ? error.containsPII : false,
    classification: error instanceof ApiError ? 
      error.securityContext.classification : 
      'SYSTEM',
    sourceIp: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id
  };

  // Determine error details
  const statusCode = error instanceof ApiError ? 
    error.statusCode : 
    StatusCodes.INTERNAL_SERVER_ERROR;

  const errorCode = error instanceof ApiError ? 
    error.code : 
    DEFAULT_ERROR_CODE;

  // Create sanitized error message
  const message = error instanceof ApiError ?
    error.message :
    i18next.t(DEFAULT_ERROR_MESSAGE);

  // Prepare error details with stack trace limitation
  const errorDetails = error instanceof ApiError ? 
    error.details : 
    process.env.NODE_ENV === 'development' ? 
      { stack: error.stack?.substring(0, MAX_ERROR_STACK_LENGTH) } : 
      undefined;

  // Create standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    code: errorCode,
    details: errorDetails,
    timestamp: new Date().toISOString(),
    correlationId,
    traceId: (req as any).traceId,
    securityContext
  };

  // Log error with security context
  logger.error(message, error, {
    requestId: req.id,
    correlationId,
    userId: (req as any).user?.id,
    clientIp: req.ip,
    userAgent: req.get('user-agent'),
    action: 'ERROR_HANDLER',
    resourceType: 'API_ERROR',
    resourceId: correlationId,
    securityLevel: securityContext.level,
    containsPII: securityContext.containsPII,
    metadata: {
      path: req.path,
      method: req.method,
      statusCode,
      errorCode
    }
  });

  // Trigger security audit for specific error types
  if (statusCode >= 400) {
    logger.security(
      'Security relevant error occurred',
      securityContext.level,
      {
        requestId: req.id,
        correlationId,
        userId: (req as any).user?.id,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
        action: 'SECURITY_ERROR',
        resourceType: 'API_ERROR',
        resourceId: correlationId,
        securityLevel: securityContext.level,
        containsPII: securityContext.containsPII
      },
      error
    );
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Enhanced 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = uuidv4();
  
  // Log 404 error
  logger.error(
    `Route not found: ${req.method} ${req.path}`,
    new Error('Route not found'),
    {
      requestId: req.id,
      correlationId,
      userId: (req as any).user?.id,
      clientIp: req.ip,
      userAgent: req.get('user-agent'),
      action: 'NOT_FOUND',
      resourceType: 'ROUTE',
      resourceId: req.path,
      securityLevel: 'LOW',
      containsPII: false
    }
  );

  // Create and pass 404 error to main error handler
  const notFoundError = new ApiError(
    StatusCodes.NOT_FOUND,
    'Route not found',
    'ROUTE_NOT_FOUND',
    {
      path: req.path,
      method: req.method
    },
    'LOW',
    false
  );

  next(notFoundError);
};