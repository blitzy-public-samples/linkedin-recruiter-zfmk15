// @ts-nocheck
import { sign, verify, decode, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'; // v9.0.0
import { JWTPayload } from '../types/auth.types';
import { authConfig } from '../config/auth.config';

/**
 * Enhanced optional parameters for token generation and validation
 */
interface TokenOptions {
  expiresIn?: number;      // Token expiration time in seconds
  algorithm?: string;      // JWT signing algorithm (default: HS512)
  issuer?: string;        // Token issuer identifier
  audience?: string;      // Token audience scope
  includePermissions?: boolean; // Include permissions in token payload
}

/**
 * Custom error type for token validation failures with detailed context
 */
export class TokenValidationError extends Error {
  code: string;
  originalError?: any;

  constructor(message: string, code: string, originalError?: any) {
    super(message);
    this.name = 'TokenValidationError';
    this.code = code;
    this.originalError = originalError;
  }
}

// In-memory token revocation cache (should be replaced with Redis in production)
const revokedTokens = new Set<string>();

/**
 * Generates a cryptographically secure JWT token with enhanced security features
 * @param payload - User payload containing identity and authorization data
 * @param options - Optional token generation parameters
 * @returns Signed JWT token string
 * @throws Error if payload is invalid or signing fails
 */
export const generateToken = (
  payload: JWTPayload,
  options?: TokenOptions
): string => {
  // Validate required payload fields
  if (!payload.userId || !payload.email || !payload.role) {
    throw new TokenValidationError(
      'Invalid payload: missing required fields',
      'INVALID_PAYLOAD'
    );
  }

  // Extract JWT configuration
  const { secret, algorithm, issuer, audience } = authConfig.jwt;

  // Merge default options with provided options
  const tokenOptions = {
    algorithm: options?.algorithm || algorithm,
    expiresIn: options?.expiresIn || authConfig.jwt.expiresIn,
    issuer: options?.issuer || issuer,
    audience: options?.audience || audience,
    includePermissions: options?.includePermissions ?? true
  };

  try {
    // Prepare token payload with standard claims
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      // Only include permissions if specified
      ...(tokenOptions.includePermissions ? { permissions: payload.permissions } : {})
    };

    // Sign token with configured secret and options
    return sign(tokenPayload, secret, {
      algorithm: tokenOptions.algorithm,
      expiresIn: tokenOptions.expiresIn,
      issuer: tokenOptions.issuer,
      audience: tokenOptions.audience
    });
  } catch (error) {
    throw new TokenValidationError(
      'Token generation failed',
      'TOKEN_GENERATION_ERROR',
      error
    );
  }
};

/**
 * Verifies JWT token signature and validates claims with comprehensive security checks
 * @param token - JWT token string to verify
 * @param options - Optional verification parameters
 * @returns Decoded and verified token payload
 * @throws TokenValidationError for various validation failures
 */
export const verifyToken = async (
  token: string,
  options?: TokenOptions
): Promise<JWTPayload> => {
  // Extract JWT configuration
  const { secret, issuer, audience } = authConfig.jwt;

  // Basic token format validation
  if (!token || typeof token !== 'string' || !token.startsWith('Bearer ')) {
    throw new TokenValidationError(
      'Invalid token format',
      'INVALID_TOKEN_FORMAT'
    );
  }

  // Extract token from Bearer scheme
  const tokenString = token.split(' ')[1];

  // Check token revocation
  if (revokedTokens.has(tokenString)) {
    throw new TokenValidationError(
      'Token has been revoked',
      'TOKEN_REVOKED'
    );
  }

  try {
    // Verify token signature and claims
    const decoded = verify(tokenString, secret, {
      issuer: options?.issuer || issuer,
      audience: options?.audience || audience,
      algorithms: [options?.algorithm || authConfig.jwt.algorithm]
    }) as JWTPayload;

    // Additional security validations
    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new TokenValidationError(
        'Token payload missing required claims',
        'INVALID_CLAIMS'
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new TokenValidationError(
        'Token has expired',
        'TOKEN_EXPIRED',
        error
      );
    }
    if (error instanceof JsonWebTokenError) {
      throw new TokenValidationError(
        'Token validation failed',
        'TOKEN_INVALID',
        error
      );
    }
    throw new TokenValidationError(
      'Token verification failed',
      'VERIFICATION_ERROR',
      error
    );
  }
};

/**
 * Safely decodes JWT token without signature verification for inspection
 * @param token - JWT token string to decode
 * @returns Decoded token payload
 * @throws TokenValidationError if token format is invalid
 */
export const decodeToken = (token: string): JWTPayload => {
  if (!token || typeof token !== 'string') {
    throw new TokenValidationError(
      'Invalid token format',
      'INVALID_TOKEN_FORMAT'
    );
  }

  try {
    // Remove Bearer prefix if present
    const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    
    // Decode token without verification
    const decoded = decode(tokenString) as JWTPayload;
    
    if (!decoded || typeof decoded !== 'object') {
      throw new TokenValidationError(
        'Invalid token payload',
        'INVALID_PAYLOAD'
      );
    }

    return decoded;
  } catch (error) {
    throw new TokenValidationError(
      'Token decoding failed',
      'DECODE_ERROR',
      error
    );
  }
};

/**
 * Revokes a JWT token by adding it to the revocation list
 * @param token - JWT token to revoke
 * @throws TokenValidationError if token is invalid
 */
export const revokeToken = (token: string): void => {
  if (!token || typeof token !== 'string') {
    throw new TokenValidationError(
      'Invalid token format',
      'INVALID_TOKEN_FORMAT'
    );
  }

  const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
  revokedTokens.add(tokenString);

  // Schedule token removal from revocation list after TTL
  setTimeout(() => {
    revokedTokens.delete(tokenString);
  }, authConfig.jwt.revokedTokenTTL * 1000);
};