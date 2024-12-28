// @ts-nocheck
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { AuthenticationClient } from 'auth0'; // v3.3.0
import { rateLimit } from 'express-rate-limit'; // v6.9.0
import { injectable, inject } from 'inversify'; // v6.1.0
import { controller, httpPost, httpGet } from 'inversify-express-utils'; // v6.4.3

import { generateToken, verifyToken, detectTokenReuse, revokeToken } from '../utils/jwt.utils';
import { authConfig } from '../config/auth.config';
import { 
  LoginRequest, 
  LoginResponse, 
  UserProfile, 
  JWTPayload, 
  UserRole,
  AuthenticatedRequest
} from '../types/auth.types';
import { Logger } from '../utils/logger';

// Rate limiting configurations
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later'
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 refresh attempts per hour
  message: 'Too many token refresh attempts'
});

@injectable()
@controller('/auth')
export class AuthController {
  private auth0Client: AuthenticationClient;
  private logger: Logger;

  constructor(
    @inject('AuthenticationClient') auth0Client: AuthenticationClient,
    @inject('Logger') logger: Logger
  ) {
    this.auth0Client = auth0Client;
    this.logger = logger;
  }

  /**
   * Enhanced login handler with MFA validation and security monitoring
   * @param req Login request with credentials and MFA token
   * @param res Express response object
   * @param next Express next function
   */
  @httpPost('/login')
  async login(
    req: Request<{}, {}, LoginRequest>,
    res: Response,
    next: NextFunction
  ): Promise<Response> {
    try {
      const { email, password, mfaToken, deviceFingerprint } = req.body;

      // Validate request body
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Invalid request: email and password required' 
        });
      }

      // Authenticate with Auth0
      const auth0Response = await this.auth0Client.authenticate({
        username: email,
        password,
        scope: authConfig.auth0.scope
      });

      // Check if MFA is required for user
      if (auth0Response.requires_mfa && !mfaToken) {
        return res.status(403).json({
          error: 'MFA token required',
          mfaRequired: true
        });
      }

      // Validate MFA token if provided
      if (mfaToken) {
        const mfaValid = await this.validateMFA(auth0Response.user_id, mfaToken);
        if (!mfaValid) {
          this.logger.warn('Invalid MFA attempt', { email });
          return res.status(401).json({ error: 'Invalid MFA token' });
        }
      }

      // Generate user profile
      const userProfile: UserProfile = {
        id: auth0Response.user_id,
        email: auth0Response.email,
        role: this.determineUserRole(auth0Response),
        firstName: auth0Response.given_name,
        lastName: auth0Response.family_name,
        lastLogin: new Date(),
        mfaEnabled: auth0Response.mfa_enabled
      };

      // Generate JWT tokens
      const tokenPayload: JWTPayload = {
        userId: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        permissions: this.getRolePermissions(userProfile.role),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + authConfig.jwt.expiresIn
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateToken(tokenPayload, { 
        expiresIn: authConfig.jwt.expiresIn * 2 
      });

      // Log successful login
      this.logger.info('Successful login', { 
        userId: userProfile.id, 
        email: userProfile.email,
        deviceFingerprint 
      });

      return res.status(200).json({
        token: accessToken,
        refreshToken,
        user: userProfile,
        expiresIn: authConfig.jwt.expiresIn
      } as LoginResponse);

    } catch (error) {
      this.logger.error('Login failed', { error, email: req.body.email });
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }

  /**
   * Enhanced token refresh with sliding sessions and reuse detection
   * @param req Authenticated request with refresh token
   * @param res Express response object
   * @param next Express next function
   */
  @httpPost('/refresh')
  @refreshLimiter
  async refreshToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response> {
    try {
      const { refreshToken, deviceFingerprint } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      // Verify refresh token and check for reuse
      const decoded = await verifyToken(refreshToken);
      const isReused = await detectTokenReuse(refreshToken);

      if (isReused) {
        // Potential token reuse attack - revoke all tokens for user
        await this.revokeUserTokens(decoded.userId);
        this.logger.warn('Token reuse detected', { 
          userId: decoded.userId,
          deviceFingerprint 
        });
        return res.status(401).json({ error: 'Token security violation' });
      }

      // Generate new tokens with sliding expiration
      const newTokenPayload: JWTPayload = {
        ...decoded,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + authConfig.jwt.expiresIn
      };

      const newAccessToken = generateToken(newTokenPayload);
      const newRefreshToken = generateToken(newTokenPayload, {
        expiresIn: authConfig.jwt.expiresIn * 2
      });

      // Revoke old refresh token
      await revokeToken(refreshToken);

      this.logger.info('Token refreshed', { 
        userId: decoded.userId,
        deviceFingerprint 
      });

      return res.status(200).json({
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: authConfig.jwt.expiresIn
      });

    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  /**
   * Secure logout with token revocation
   * @param req Authenticated request
   * @param res Express response object
   */
  @httpPost('/logout')
  async logout(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const { token, refreshToken } = req.body;

      // Revoke both access and refresh tokens
      if (token) await revokeToken(token);
      if (refreshToken) await revokeToken(refreshToken);

      this.logger.info('User logged out', { 
        userId: req.user?.userId 
      });

      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      this.logger.error('Logout failed', { error });
      return res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Validates MFA token for user
   * @param userId User ID for MFA validation
   * @param mfaToken MFA token to validate
   * @returns boolean indicating MFA validity
   */
  private async validateMFA(userId: string, mfaToken: string): Promise<boolean> {
    try {
      const validation = await this.auth0Client.authenticateWithMfa({
        user_id: userId,
        mfa_token: mfaToken
      });

      return validation.valid;
    } catch (error) {
      this.logger.error('MFA validation failed', { error, userId });
      return false;
    }
  }

  /**
   * Determines user role from Auth0 response
   * @param auth0Response Auth0 authentication response
   * @returns UserRole enum value
   */
  private determineUserRole(auth0Response: any): UserRole {
    const roles = auth0Response.roles || [];
    if (roles.includes('admin')) return UserRole.ADMIN;
    if (roles.includes('recruiter')) return UserRole.RECRUITER;
    return UserRole.HIRING_MANAGER;
  }

  /**
   * Gets permissions for given role
   * @param role User role
   * @returns Array of permission strings
   */
  private getRolePermissions(role: UserRole): string[] {
    const permissions = {
      [UserRole.ADMIN]: [
        'read:profiles',
        'write:profiles',
        'delete:profiles',
        'manage:users',
        'view:analytics'
      ],
      [UserRole.RECRUITER]: [
        'read:profiles',
        'write:profiles',
        'view:analytics'
      ],
      [UserRole.HIRING_MANAGER]: [
        'read:profiles',
        'view:analytics'
      ]
    };
    return permissions[role] || [];
  }

  /**
   * Revokes all tokens for a user
   * @param userId User ID to revoke tokens for
   */
  private async revokeUserTokens(userId: string): Promise<void> {
    try {
      await this.auth0Client.revokeRefreshTokens({ user_id: userId });
      this.logger.info('User tokens revoked', { userId });
    } catch (error) {
      this.logger.error('Token revocation failed', { error, userId });
      throw error;
    }
  }
}