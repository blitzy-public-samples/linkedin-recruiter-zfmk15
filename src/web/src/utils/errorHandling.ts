// Error Handling Utility v1.0.0
// Dependencies:
// - axios: ^1.4.0
// - winston: ^3.8.0

import { AxiosError } from 'axios';
import { createLogger, format, transports } from 'winston';
import { ENDPOINTS, ERROR_CODES } from '../config/api.config';

// Error severity levels for monitoring and logging
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Interface for standardized API error structure
export interface ApiError {
  status: number;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  severity?: ErrorSeverity;
  timestamp?: Date;
}

// Options for error handling configuration
interface ErrorHandlingOptions {
  includeStack?: boolean;
  logToMonitoring?: boolean;
  filterSensitiveData?: boolean;
}

// Options for error message formatting
interface MessageOptions {
  includeContext?: boolean;
  localize?: boolean;
  maxLength?: number;
}

// Options for error logging
interface LogOptions {
  batchLogging?: boolean;
  alertThreshold?: number;
  securityContext?: Record<string, unknown>;
}

// Configure Winston logger with secure defaults
const logger = createLogger({
  level: 'error',
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.errors({ stack: true })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

/**
 * Type guard to validate if an error matches the ApiError interface
 * @param error - Error object to validate
 * @returns boolean indicating if error matches ApiError type
 */
export const isApiError = (error: unknown): error is ApiError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const apiError = error as ApiError;
  return (
    typeof apiError.status === 'number' &&
    typeof apiError.message === 'string' &&
    typeof apiError.code === 'string' &&
    apiError.status >= 100 &&
    apiError.status < 600
  );
};

/**
 * Filters sensitive information from error details
 * @param details - Error details object
 * @returns Filtered error details
 */
const filterSensitiveData = (details: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credentials'];
  const filtered = { ...details };

  for (const key of Object.keys(filtered)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      filtered[key] = '[REDACTED]';
    }
  }

  return filtered;
};

/**
 * Processes API errors into standardized format with enhanced error detection
 * @param error - Original error object
 * @param options - Error handling configuration options
 * @returns Standardized ApiError object
 */
export const handleApiError = (
  error: Error | AxiosError,
  options: ErrorHandlingOptions = {}
): ApiError => {
  const { includeStack = false, filterSensitiveData: shouldFilter = true } = options;

  // Initialize base error structure
  const apiError: ApiError = {
    status: 500,
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    timestamp: new Date()
  };

  if (axios.isAxiosError(error)) {
    // Handle Axios specific errors
    if (error.response) {
      apiError.status = error.response.status;
      apiError.message = error.response.data?.message || error.message;
      apiError.code = error.response.data?.code || `HTTP_${error.response.status}`;
      apiError.details = shouldFilter
        ? filterSensitiveData(error.response.data)
        : error.response.data;
    } else if (error.request) {
      // Network error handling
      apiError.status = 0;
      apiError.code = ERROR_CODES.NETWORK_ERROR;
      apiError.message = 'Network error occurred';
    } else {
      // Request configuration error
      apiError.status = 400;
      apiError.code = 'REQUEST_CONFIG_ERROR';
      apiError.message = error.message;
    }

    // Handle timeout specifically
    if (error.code === 'ECONNABORTED') {
      apiError.code = ERROR_CODES.TIMEOUT;
      apiError.status = 408;
      apiError.message = 'Request timeout';
    }

    // Handle rate limiting
    if (apiError.status === 429) {
      apiError.code = ERROR_CODES.RATE_LIMIT_EXCEEDED;
      apiError.message = 'Rate limit exceeded';
    }
  } else {
    // Handle generic Error objects
    apiError.message = error.message;
    apiError.details = includeStack ? { stack: error.stack } : undefined;
  }

  // Determine error severity based on status code
  apiError.severity = apiError.status >= 500
    ? ErrorSeverity.HIGH
    : apiError.status >= 400
      ? ErrorSeverity.MEDIUM
      : ErrorSeverity.LOW;

  return apiError;
};

/**
 * Extracts and formats user-friendly error messages
 * @param error - Error object or message
 * @param options - Message formatting options
 * @returns Formatted user-friendly message
 */
export const getErrorMessage = (
  error: Error | ApiError | string,
  options: MessageOptions = {}
): string => {
  const { includeContext = true, maxLength = 150 } = options;

  let message: string;

  if (typeof error === 'string') {
    message = error;
  } else if (isApiError(error)) {
    message = error.message;
    if (includeContext && error.details?.context) {
      message += `: ${error.details.context}`;
    }
  } else {
    message = error.message;
  }

  // Truncate message if needed
  if (maxLength && message.length > maxLength) {
    message = `${message.substring(0, maxLength - 3)}...`;
  }

  return message;
};

/**
 * Securely logs error details with monitoring integration
 * @param error - Error object to log
 * @param context - Additional context information
 * @param options - Logging configuration options
 */
export const logError = (
  error: Error | ApiError,
  context: string,
  options: LogOptions = {}
): void => {
  const { securityContext, alertThreshold } = options;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: isApiError(error) ? error : handleApiError(error),
    security: securityContext
  };

  // Filter sensitive data before logging
  if (logEntry.error.details) {
    logEntry.error.details = filterSensitiveData(logEntry.error.details);
  }

  // Determine log level based on severity
  const logLevel = isApiError(error) && error.severity === ErrorSeverity.CRITICAL
    ? 'error'
    : 'warn';

  // Log the error
  logger.log(logLevel, logEntry);

  // Trigger alerts if threshold is exceeded
  if (alertThreshold && logEntry.error.severity === ErrorSeverity.HIGH) {
    // Implementation for alert triggering would go here
    // This could integrate with external monitoring services
  }
};