// @ts-nocheck
import { config } from 'dotenv'; // v16.0.3
import { UserRole } from '../types/auth.types';

// Initialize environment variables
config();

/**
 * JWT token configuration interface with comprehensive security settings
 */
interface JWTConfig {
  secret: string;
  expiresIn: number;        // Expiration in seconds
  algorithm: string;        // JWT signing algorithm
  issuer: string;          // Token issuer identifier
  audience: string;        // Token audience scope
  enableRevocation: boolean; // Token revocation support
  revokedTokenTTL: number;  // TTL for revoked tokens in seconds
}

/**
 * Auth0 integration configuration interface with rate limiting
 */
interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  scope: string;
  allowedCallbacks: string[];
  rateLimit: number;        // Requests per window
  rateLimitWindow: number;  // Window in milliseconds
  enableLogging: boolean;   // Detailed Auth0 logging
}

/**
 * TOTP (Time-based One-Time Password) configuration interface
 */
interface TOTPConfig {
  digits: number;          // Number of digits in TOTP
  step: number;           // Time step in seconds
  algorithm: string;      // TOTP algorithm (SHA1, SHA256, SHA512)
  window: number;         // Validation window in steps
}

/**
 * Backup codes configuration for MFA fallback
 */
interface BackupCodeConfig {
  count: number;          // Number of backup codes
  length: number;         // Length of each code
  onlyOnce: boolean;      // Single-use codes only
  expiryDays: number;     // Days until backup codes expire
}

/**
 * OAuth configuration interface with MFA support
 */
interface OAuthConfig {
  tokenEndpoint: string;
  tokenExpiration: number;
  allowedOrigins: string[];
  requireMFA: boolean;
  totpSettings: TOTPConfig;
  backupCodeSettings: BackupCodeConfig;
  mfaEnrollmentExpiry: number;  // Hours to complete MFA enrollment
  mfaExemptRoles: UserRole[];   // Roles exempt from MFA
  enableEmergencyBypass: boolean; // Emergency MFA bypass option
}

// Global configuration constants from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const MFA_REQUIRED = process.env.MFA_REQUIRED === 'true';
const TOTP_WINDOW = parseInt(process.env.TOTP_WINDOW || '30', 10);
const BACKUP_CODES_COUNT = parseInt(process.env.BACKUP_CODES_COUNT || '10', 10);

/**
 * Validates authentication configuration completeness and security requirements
 * @throws Error if configuration is invalid or insecure
 */
const validateConfig = (): void => {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
    throw new Error('Auth0 configuration is incomplete');
  }

  if (MFA_REQUIRED) {
    validateMFAConfig(authConfig.oauth.totpSettings, authConfig.oauth.backupCodeSettings);
  }
};

/**
 * Validates MFA-specific configuration settings
 * @param totpConfig - TOTP configuration settings
 * @param backupConfig - Backup codes configuration
 * @returns boolean indicating valid configuration
 * @throws Error if MFA configuration is invalid
 */
const validateMFAConfig = (totpConfig: TOTPConfig, backupConfig: BackupCodeConfig): boolean => {
  if (totpConfig.digits < 6 || totpConfig.digits > 8) {
    throw new Error('TOTP digits must be between 6 and 8');
  }

  if (!['SHA1', 'SHA256', 'SHA512'].includes(totpConfig.algorithm)) {
    throw new Error('Invalid TOTP algorithm specified');
  }

  if (backupConfig.length < 8 || backupConfig.count < 5) {
    throw new Error('Backup codes configuration does not meet security requirements');
  }

  return true;
};

/**
 * Comprehensive authentication configuration object
 * Implements enterprise-grade security settings with MFA support
 */
export const authConfig = {
  jwt: {
    secret: JWT_SECRET,
    expiresIn: 3600,  // 1 hour
    algorithm: 'HS512',
    issuer: 'linkedin-profile-search-api',
    audience: 'linkedin-profile-search-client',
    enableRevocation: true,
    revokedTokenTTL: 86400  // 24 hours
  } as JWTConfig,

  auth0: {
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
    audience: `https://${AUTH0_DOMAIN}/api/v2/`,
    scope: 'read:users update:users',
    allowedCallbacks: [
      'http://localhost:3000/callback',
      'https://app.linkedin-profile-search.com/callback'
    ],
    rateLimit: 100,
    rateLimitWindow: 60000,  // 1 minute
    enableLogging: true
  } as Auth0Config,

  oauth: {
    tokenEndpoint: '/api/v1/auth/token',
    tokenExpiration: 3600,
    allowedOrigins: [
      'http://localhost:3000',
      'https://app.linkedin-profile-search.com'
    ],
    requireMFA: MFA_REQUIRED,
    totpSettings: {
      digits: 6,
      step: 30,
      algorithm: 'SHA256',
      window: TOTP_WINDOW
    },
    backupCodeSettings: {
      count: BACKUP_CODES_COUNT,
      length: 10,
      onlyOnce: true,
      expiryDays: 90
    },
    mfaEnrollmentExpiry: 24,  // 24 hours to complete MFA enrollment
    mfaExemptRoles: [UserRole.ADMIN],  // Admins can bypass MFA if needed
    enableEmergencyBypass: false  // Emergency MFA bypass disabled by default
  } as OAuthConfig
};

// Validate configuration on module load
validateConfig();