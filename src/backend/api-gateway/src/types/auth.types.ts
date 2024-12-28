// @ts-nocheck
import { Request } from 'express'; // v4.18.2 - Express Request type for authenticated request extension

/**
 * Enumeration of available user roles for Role-Based Access Control (RBAC)
 * Implements strict access control hierarchy as per security requirements
 */
export enum UserRole {
    ADMIN = 'ADMIN',           // Full system access with all permissions
    RECRUITER = 'RECRUITER',   // Profile management and search capabilities
    HIRING_MANAGER = 'HIRING_MANAGER' // View and analysis permissions only
}

/**
 * JWT token payload structure with comprehensive user context and security features
 * Implements secure session management as per OAuth 2.0 specifications
 */
export interface JWTPayload {
    userId: string;        // Unique user identifier
    email: string;        // User email for identification
    role: UserRole;       // RBAC role assignment
    iat: number;          // Token issued at timestamp
    exp: number;          // Token expiration timestamp
    permissions: string[]; // Granular permission flags
}

/**
 * Login request payload structure with Multi-Factor Authentication support
 * Implements secure authentication flow with MFA capabilities
 */
export interface LoginRequest {
    email: string;     // User email credential
    password: string;  // User password (should be transmitted securely)
    mfaToken?: string; // Optional MFA token for 2FA verification
}

/**
 * Extended user profile data structure with security and audit features
 * Implements comprehensive user context for security tracking
 */
export interface UserProfile {
    id: string;           // Unique user identifier
    email: string;        // User email address
    role: UserRole;       // RBAC role assignment
    firstName: string;    // User first name
    lastName: string;     // User last name
    lastLogin: Date;      // Last successful login timestamp
    mfaEnabled: boolean;  // MFA activation status
}

/**
 * Enhanced login response with token management capabilities
 * Implements JWT session handling with refresh token support
 */
export interface LoginResponse {
    token: string;         // JWT access token
    refreshToken: string;  // JWT refresh token for session extension
    user: UserProfile;     // User profile information
    expiresIn: number;     // Token expiration time in seconds
}

/**
 * Extended Express Request interface with authenticated user context
 * Implements type-safe request augmentation for authenticated routes
 */
export interface AuthenticatedRequest extends Request {
    user: JWTPayload;     // Authenticated user context from JWT
}