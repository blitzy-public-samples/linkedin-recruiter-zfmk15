/**
 * @file Type definitions for authentication, authorization and user management
 * @version 1.0.0
 * @description Defines comprehensive types for JWT token-based authentication and 
 * role-based access control with strict type safety
 */

/**
 * Strongly typed enum defining available user roles for RBAC
 * Maps to role-based permissions defined in technical specifications
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER', 
  HIRING_MANAGER = 'HIRING_MANAGER'
}

/**
 * Type-safe interface for login request payload
 * Includes optional MFA token support for 2FA
 */
export interface LoginRequest {
  /** Email must match standard email format */
  email: string;
  /** Password field marked as sensitive - never logged */
  password: string;
  /** Optional MFA token for two-factor authentication */
  mfaToken?: string;
}

/**
 * Interface for successful login response
 * Contains JWT token and complete user profile
 */
export interface LoginResponse {
  /** JWT token for subsequent authenticated requests */
  token: string;
  /** Complete user profile data */
  user: UserProfile;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Comprehensive interface for user profile data
 * Contains all user management fields
 */
export interface UserProfile {
  /** Unique user identifier as UUID */
  id: string;
  /** User's email address with validation pattern */
  email: string;
  /** User's assigned role for RBAC */
  role: UserRole;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Timestamp of last successful login */
  lastLogin: Date;
  /** Flag indicating if user account is active */
  isActive: boolean;
  /** User preferences as key-value store */
  preferences: Record<string, unknown>;
}

/**
 * Strictly typed interface for JWT token payload
 * Includes all standard JWT claims plus custom fields
 */
export interface JWTPayload {
  /** Subject identifier (user ID) as UUID */
  sub: string;
  /** User's email address */
  email: string;
  /** User's role for authorization */
  role: UserRole;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
  /** Token issuer identifier */
  iss: string;
  /** Token audience identifier */
  aud: string;
}