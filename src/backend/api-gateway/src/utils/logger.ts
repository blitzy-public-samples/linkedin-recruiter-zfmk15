// External imports with versions
import winston from 'winston'; // v3.10.0
import ecsFormat from '@elastic/ecs-winston-format'; // v1.3.1
import crypto from 'crypto';
import path from 'path';

// Interface definitions for logger configuration
interface LoggerConfig {
  level: string;
  serviceName: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableEncryption: boolean;
  logRetentionDays: number;
  elkConfig: {
    node: string;
    auth: {
      username: string;
      password: string;
    };
    index: string;
  };
}

// Interface for enhanced logging context with security focus
interface LogContext {
  requestId: string;
  correlationId: string;
  userId: string;
  clientIp: string;
  userAgent: string;
  action: string;
  resourceType: string;
  resourceId: string;
  securityLevel: string;
  containsPII: boolean;
  metadata?: any;
}

// Default configuration with security settings
const defaultConfig: LoggerConfig = {
  level: 'info',
  serviceName: 'api-gateway',
  enableConsole: true,
  enableFile: true,
  enableEncryption: true,
  logRetentionDays: 90,
  elkConfig: {
    node: 'http://elasticsearch:9200',
    auth: {
      username: 'elastic',
      password: 'ENCRYPTED_PASSWORD'
    },
    index: 'api-gateway-logs'
  }
};

// Utility functions for log security
const maskPII = (data: any): any => {
  if (!data) return data;
  
  const piiPatterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g
  };

  let maskedData = JSON.stringify(data);
  Object.values(piiPatterns).forEach(pattern => {
    maskedData = maskedData.replace(pattern, '***REDACTED***');
  });

  return JSON.parse(maskedData);
};

const encryptSensitiveData = (data: string): string => {
  if (!defaultConfig.enableEncryption) return data;
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.LOG_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

// Create and configure Winston logger instance
const createLogger = (config: LoggerConfig = defaultConfig): winston.Logger => {
  const loggerOptions: winston.LoggerOptions = {
    level: config.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      ecsFormat({ convertReqRes: true }),
      winston.format.metadata(),
      winston.format.json()
    )
  };

  const transports: winston.transport[] = [];

  // Console transport configuration
  if (config.enableConsole) {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  // File transport configuration
  if (config.enableFile) {
    transports.push(new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxFiles: config.logRetentionDays,
      maxsize: 10485760, // 10MB
      tailable: true
    }));

    transports.push(new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxFiles: config.logRetentionDays,
      maxsize: 10485760,
      tailable: true
    }));
  }

  const logger = winston.createLogger({
    ...loggerOptions,
    transports,
    defaultMeta: {
      service: config.serviceName
    }
  });

  return logger;
};

// Create logger instance
const logger = createLogger();

// Enhanced logging functions with security features
const audit = (message: string, context: LogContext, auditDetails: any): void => {
  const maskedDetails = maskPII(auditDetails);
  const securityContext = {
    ...context,
    timestamp: new Date().toISOString(),
    type: 'SECURITY_AUDIT',
    details: config.enableEncryption ? encryptSensitiveData(JSON.stringify(maskedDetails)) : maskedDetails
  };

  logger.log('info', message, { ...securityContext, level: 'AUDIT' });
};

const security = (
  message: string,
  severity: string,
  context: LogContext,
  error?: Error
): void => {
  const securityEvent = {
    ...context,
    timestamp: new Date().toISOString(),
    type: 'SECURITY_EVENT',
    severity,
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : undefined
  };

  logger.log(severity.toLowerCase(), message, securityEvent);
};

const error = (message: string, error: Error, context: LogContext): void => {
  const errorContext = {
    ...context,
    timestamp: new Date().toISOString(),
    type: 'ERROR',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  };

  logger.error(message, errorContext);
};

// Export configured logger instance with enhanced methods
export const loggerInstance = {
  info: logger.info.bind(logger),
  error: error,
  audit: audit,
  security: security,
  // Expose original winston logger for advanced use cases
  winston: logger
};

export default loggerInstance;