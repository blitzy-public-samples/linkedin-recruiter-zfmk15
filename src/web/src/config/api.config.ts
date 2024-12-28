// API Configuration v1.0.0
// Dependencies:
// - vite: ^4.0.0 (for process.env access)

/**
 * Type definitions for API configuration
 */
interface APIEndpoint {
  readonly [key: string]: string;
}

interface APIEndpoints {
  readonly AUTH: APIEndpoint;
  readonly SEARCH: APIEndpoint;
  readonly PROFILES: APIEndpoint;
  readonly ANALYTICS: APIEndpoint;
}

interface APIRateLimits {
  readonly SEARCH: number;
  readonly PROFILES: number;
  readonly ANALYTICS: number;
  readonly EXPORT: number;
}

interface APITimeouts {
  readonly DEFAULT: number;
  readonly LONG: number;
  readonly EXPORT: number;
  readonly ANALYSIS: number;
}

interface APIErrorCodes {
  readonly INVALID_CONFIG: string;
  readonly RATE_LIMIT_EXCEEDED: string;
  readonly TIMEOUT: string;
  readonly NETWORK_ERROR: string;
}

interface APIConfig {
  readonly BASE_URL: string;
  readonly API_VERSION: string;
  readonly ENDPOINTS: APIEndpoints;
  readonly RATE_LIMITS: APIRateLimits;
  readonly TIMEOUTS: APITimeouts;
  readonly ERROR_CODES: APIErrorCodes;
}

/**
 * Base configuration values
 */
export const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const API_VERSION = 'v1';

/**
 * API Endpoints configuration
 * Organized by domain/feature area
 */
export const ENDPOINTS: APIEndpoints = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify'
  },
  SEARCH: {
    CREATE: '/search',
    LIST: '/search',
    GET: '/search/:id',
    UPDATE: '/search/:id',
    DELETE: '/search/:id',
    TEMPLATES: '/search/templates',
    SAVE_TEMPLATE: '/search/templates/:id'
  },
  PROFILES: {
    LIST: '/profiles',
    GET: '/profiles/:id',
    ANALYZE: '/profiles/:id/analyze',
    EXPORT: '/profiles/export',
    BATCH_ANALYZE: '/profiles/batch/analyze',
    HISTORY: '/profiles/:id/history'
  },
  ANALYTICS: {
    METRICS: '/analytics/metrics',
    CHARTS: '/analytics/charts',
    EXPORT: '/analytics/export',
    DASHBOARD: '/analytics/dashboard',
    CUSTOM: '/analytics/custom'
  }
} as const;

/**
 * API Rate limits (requests per hour)
 */
export const RATE_LIMITS: APIRateLimits = {
  SEARCH: 100,
  PROFILES: 1000,
  ANALYTICS: 500,
  EXPORT: 50
} as const;

/**
 * API Timeout configurations (in milliseconds)
 */
export const TIMEOUTS: APITimeouts = {
  DEFAULT: 30000, // 30 seconds
  LONG: 60000,    // 1 minute
  EXPORT: 120000, // 2 minutes
  ANALYSIS: 90000 // 1.5 minutes
} as const;

/**
 * API Error codes for consistent error handling
 */
export const ERROR_CODES: APIErrorCodes = {
  INVALID_CONFIG: 'API_CONFIG_001',
  RATE_LIMIT_EXCEEDED: 'API_RATE_001',
  TIMEOUT: 'API_TIMEOUT_001',
  NETWORK_ERROR: 'API_NETWORK_001'
} as const;

/**
 * Validates the API configuration
 * @param config The API configuration to validate
 * @returns boolean indicating if the configuration is valid
 */
export const validateConfig = (config: APIConfig): boolean => {
  try {
    // Validate BASE_URL
    new URL(config.BASE_URL);

    // Validate API_VERSION format
    if (!/^v\d+$/.test(config.API_VERSION)) {
      return false;
    }

    // Validate ENDPOINTS
    const requiredEndpointGroups = ['AUTH', 'SEARCH', 'PROFILES', 'ANALYTICS'];
    if (!requiredEndpointGroups.every(group => group in config.ENDPOINTS)) {
      return false;
    }

    // Validate RATE_LIMITS
    const rateLimits = Object.values(config.RATE_LIMITS);
    if (!rateLimits.every(limit => typeof limit === 'number' && limit > 0)) {
      return false;
    }

    // Validate TIMEOUTS
    const timeouts = Object.values(config.TIMEOUTS);
    if (!timeouts.every(timeout => typeof timeout === 'number' && timeout > 0)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Main API configuration export
 */
export const API_CONFIG: APIConfig = {
  BASE_URL,
  API_VERSION,
  ENDPOINTS,
  RATE_LIMITS,
  TIMEOUTS,
  ERROR_CODES
} as const;

// Validate configuration on import
if (!validateConfig(API_CONFIG)) {
  throw new Error(`Invalid API configuration: ${ERROR_CODES.INVALID_CONFIG}`);
}

export default API_CONFIG;