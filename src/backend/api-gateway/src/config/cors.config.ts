// @package cors@2.8.5
// @package dotenv@16.0.3

import { config } from 'dotenv';
import { CorsOptions } from 'cors';

// Load environment variables
config();

/**
 * Environment-specific configuration
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

/**
 * Interface defining the structure of CORS configuration
 */
interface CorsConfig extends CorsOptions {
  origin: string[] | boolean | ((origin: string, callback: (error: Error | null, success: boolean) => void) => void);
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * Default CORS configuration values
 */
const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin'
];
const DEFAULT_EXPOSED_HEADERS = [
  'Content-Range',
  'X-Content-Range',
  'X-Total-Count'
];
const CORS_MAX_AGE = 86400; // 24 hours in seconds

/**
 * Validates if the requesting origin is allowed to access the API
 * Implements environment-specific origin validation logic
 * 
 * @param origin - The origin of the request
 * @param callback - Function to execute with validation result
 */
const validateOrigin = (origin: string | undefined, callback: (error: Error | null, success: boolean) => void): void => {
  // Handle same-origin requests (origin will be undefined)
  if (!origin) {
    callback(null, true);
    return;
  }

  // Development environment - allow configured origins
  if (NODE_ENV === 'development') {
    if (origin.startsWith('http://localhost:') || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
  }

  // Production environment - strict origin validation
  if (NODE_ENV === 'production') {
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
  }

  // Log and reject invalid origins
  console.warn(`CORS: Rejected request from unauthorized origin: ${origin}`);
  callback(new Error('Not allowed by CORS'), false);
};

/**
 * CORS configuration object with comprehensive security controls
 */
export const corsConfig: CorsConfig = {
  // Dynamic origin validation based on environment
  origin: validateOrigin,

  // Allowed HTTP methods
  methods: DEFAULT_METHODS,

  // Allowed request headers
  allowedHeaders: DEFAULT_ALLOWED_HEADERS,

  // Headers exposed to the client
  exposedHeaders: DEFAULT_EXPOSED_HEADERS,

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Pre-flight request cache duration
  maxAge: CORS_MAX_AGE,

  // Enforce strict SSL in production
  ...(NODE_ENV === 'production' && {
    secure: true,
    strictSSL: true
  })
};

/**
 * Export additional CORS utilities and configurations
 */
export {
  validateOrigin,
  DEFAULT_METHODS,
  DEFAULT_ALLOWED_HEADERS,
  DEFAULT_EXPOSED_HEADERS,
  CORS_MAX_AGE
};