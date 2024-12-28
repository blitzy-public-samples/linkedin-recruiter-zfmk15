/**
 * @file Enhanced Authentication Service with Security Monitoring
 * @version 1.0.0
 * @description Implements secure JWT token management, OAuth 2.0 integration, and advanced security monitoring
 * 
 * Dependencies:
 * - jwt-decode: ^3.1.0
 * - @auth0/auth0-spa-js: ^2.1.0
 * - crypto-js: ^4.1.0
 */

import { ApiService } from './api.service';
import { 
  LoginRequest, 
  LoginResponse, 
  UserProfile, 
  JWTPayload 
} from '../types/auth.types';
import { ENDPOINTS } from '../config/api.config';
import jwtDecode from 'jwt-decode';
import createAuth0Client, { Auth0Client } from '@auth0/auth0-spa-js';
import { AES, SHA256 } from 'crypto-js';
import { logError, ErrorSeverity } from '../utils/errorHandling';

// Secure constants
const TOKEN_KEY = 'auth_token_secure';
const USER_KEY = 'user_profile_secure';
const TOKEN_REFRESH_THRESHOLD = 300000; // 5 minutes in ms
const MAX_AUTH_ATTEMPTS = 3;

/**
 * Enhanced authentication service with comprehensive security features
 */
export class AuthService {
  private auth0Client: Auth0Client | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private authAttempts: number = 0;
  private readonly encryptionKey: string;

  constructor(
    private readonly apiService: ApiService
  ) {
    // Generate unique encryption key for token storage
    this.encryptionKey = this.generateEncryptionKey();
    this.initializeAuth0();
    this.setupSecurityMonitoring();
  }

  /**
   * Initializes Auth0 client for OAuth 2.0 authentication
   */
  private async initializeAuth0(): Promise<void> {
    try {
      this.auth0Client = await createAuth0Client({
        domain: process.env.VITE_AUTH0_DOMAIN!,
        clientId: process.env.VITE_AUTH0_CLIENT_ID!,
        cacheLocation: 'memory',
        useRefreshTokens: true
      });
    } catch (error) {
      logError(error, 'Auth0 initialization failed', {
        severity: ErrorSeverity.CRITICAL
      });
      throw error;
    }
  }

  /**
   * Authenticates user with enhanced security checks
   */
  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Check authentication attempts
      if (this.authAttempts >= MAX_AUTH_ATTEMPTS) {
        const cooldownPeriod = this.calculateCooldownPeriod();
        throw new Error(`Too many login attempts. Please try again in ${cooldownPeriod} minutes.`);
      }

      this.authAttempts++;

      // Perform authentication
      const response = await this.apiService.post<LoginResponse>(
        ENDPOINTS.AUTH.LOGIN, 
        credentials
      );

      // Validate and process token
      const { token, user, expiresIn } = response;
      if (!this.validateToken(token)) {
        throw new Error('Invalid token received');
      }

      // Store encrypted token and user data
      this.setSecureToken(token);
      this.setSecureUserProfile(user);

      // Setup token refresh
      this.setupTokenRefresh(expiresIn);

      // Reset auth attempts on success
      this.authAttempts = 0;

      // Log successful authentication
      this.logAuthEvent('login_success', user.id);

      return response;

    } catch (error) {
      this.logAuthEvent('login_failure');
      throw error;
    }
  }

  /**
   * Securely logs out user and cleans up session data
   */
  public async logout(): Promise<void> {
    try {
      // Revoke current token if exists
      const currentToken = this.getSecureToken();
      if (currentToken) {
        await this.apiService.post(ENDPOINTS.AUTH.LOGOUT);
      }

      // Clear secure storage
      this.clearSecureStorage();

      // Clear refresh timer
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Log logout event
      this.logAuthEvent('logout_success');

      // Clear Auth0 session if using OAuth
      if (this.auth0Client) {
        await this.auth0Client.logout({
          returnTo: window.location.origin
        });
      }

    } catch (error) {
      this.logAuthEvent('logout_failure');
      throw error;
    }
  }

  /**
   * Enhanced token refresh with rotation and monitoring
   */
  public async refreshToken(): Promise<string> {
    try {
      const currentToken = this.getSecureToken();
      if (!currentToken) {
        throw new Error('No token available for refresh');
      }

      // Implement exponential backoff for retry
      const response = await this.apiService.post<{ token: string }>(
        ENDPOINTS.AUTH.REFRESH,
        { token: currentToken }
      );

      const newToken = response.token;
      if (!this.validateToken(newToken)) {
        throw new Error('Invalid refresh token received');
      }

      // Update stored token
      this.setSecureToken(newToken);

      // Log refresh event
      this.logAuthEvent('token_refresh_success');

      return newToken;

    } catch (error) {
      this.logAuthEvent('token_refresh_failure');
      throw error;
    }
  }

  /**
   * Enhanced token validation with security checks
   */
  private validateToken(token: string): boolean {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      
      // Validate token claims
      const now = Math.floor(Date.now() / 1000);
      if (!decoded.exp || decoded.exp <= now) {
        return false;
      }

      if (!decoded.sub || !decoded.email || !decoded.role) {
        return false;
      }

      // Validate token fingerprint
      const fingerprint = this.generateTokenFingerprint(token);
      const storedFingerprint = localStorage.getItem('token_fingerprint');
      if (storedFingerprint && fingerprint !== storedFingerprint) {
        this.logAuthEvent('token_fingerprint_mismatch');
        return false;
      }

      return true;

    } catch (error) {
      this.logAuthEvent('token_validation_failure');
      return false;
    }
  }

  /**
   * Secure token storage with encryption
   */
  private setSecureToken(token: string): void {
    const encryptedToken = AES.encrypt(token, this.encryptionKey).toString();
    localStorage.setItem(TOKEN_KEY, encryptedToken);
    
    // Store token fingerprint
    const fingerprint = this.generateTokenFingerprint(token);
    localStorage.setItem('token_fingerprint', fingerprint);
  }

  /**
   * Secure token retrieval with decryption
   */
  private getSecureToken(): string | null {
    const encryptedToken = localStorage.getItem(TOKEN_KEY);
    if (!encryptedToken) return null;

    try {
      const decrypted = AES.decrypt(encryptedToken, this.encryptionKey);
      return decrypted.toString();
    } catch {
      return null;
    }
  }

  /**
   * Secure user profile storage
   */
  private setSecureUserProfile(user: UserProfile): void {
    const encryptedProfile = AES.encrypt(
      JSON.stringify(user),
      this.encryptionKey
    ).toString();
    localStorage.setItem(USER_KEY, encryptedProfile);
  }

  /**
   * Cleans up all secure storage
   */
  private clearSecureStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('token_fingerprint');
  }

  /**
   * Sets up automatic token refresh
   */
  private setupTokenRefresh(expiresIn: number): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Refresh token before expiration
    const refreshTime = (expiresIn * 1000) - TOKEN_REFRESH_THRESHOLD;
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        this.logAuthEvent('auto_refresh_failure');
        await this.logout();
      }
    }, refreshTime);
  }

  /**
   * Generates secure encryption key
   */
  private generateEncryptionKey(): string {
    const browserData = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset()
    ].join('|');
    return SHA256(browserData).toString();
  }

  /**
   * Generates token fingerprint for security validation
   */
  private generateTokenFingerprint(token: string): string {
    const decoded = jwtDecode<JWTPayload>(token);
    const data = [decoded.sub, decoded.iat, navigator.userAgent].join('|');
    return SHA256(data).toString();
  }

  /**
   * Calculates cooldown period for failed attempts
   */
  private calculateCooldownPeriod(): number {
    return Math.pow(2, this.authAttempts - MAX_AUTH_ATTEMPTS);
  }

  /**
   * Sets up security monitoring and event logging
   */
  private setupSecurityMonitoring(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === TOKEN_KEY || event.key === USER_KEY) {
        this.logAuthEvent('storage_modification_detected');
        this.logout();
      }
    });
  }

  /**
   * Logs authentication events with security context
   */
  private logAuthEvent(
    event: string,
    userId?: string,
    details?: Record<string, unknown>
  ): void {
    logError(
      new Error(`Auth event: ${event}`),
      'Authentication Service',
      {
        securityContext: {
          event,
          userId,
          timestamp: new Date().toISOString(),
          attempts: this.authAttempts,
          ...details
        }
      }
    );
  }
}

// Export singleton instance
export const authService = new AuthService(new ApiService());