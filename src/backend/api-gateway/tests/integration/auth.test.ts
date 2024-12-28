// @ts-nocheck
import { describe, it, beforeEach, afterEach, expect, jest } from 'jest'; // v29.0.0
import request from 'supertest'; // v6.3.3
import express, { Express } from 'express'; // v4.18.2
import { AuthController } from '../../src/controllers/auth.controller';
import { 
  LoginRequest, 
  LoginResponse, 
  UserProfile, 
  JWTPayload, 
  UserRole,
  MFAValidation,
  DeviceFingerprint 
} from '../../src/types/auth.types';
import { generateToken, verifyToken, revokeToken } from '../../src/utils/jwt.utils';
import { authConfig } from '../../src/config/auth.config';

// Test constants
const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!',
  deviceFingerprint: {
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    deviceId: 'test-device-id'
  }
};

const TEST_USER_PROFILE: UserProfile = {
  id: 'test-user-id',
  email: TEST_USER.email,
  role: UserRole.RECRUITER,
  firstName: 'Test',
  lastName: 'User',
  lastLogin: new Date(),
  mfaEnabled: true
};

describe('Auth Integration Tests', () => {
  let app: Express;
  let authController: AuthController;
  let validToken: string;
  let validRefreshToken: string;

  // Setup test application and mocks
  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Mock Auth0 client
    const mockAuth0Client = {
      authenticate: jest.fn().mockResolvedValue({
        user_id: TEST_USER_PROFILE.id,
        email: TEST_USER_PROFILE.email,
        given_name: TEST_USER_PROFILE.firstName,
        family_name: TEST_USER_PROFILE.lastName,
        roles: ['recruiter'],
        mfa_enabled: true
      }),
      authenticateWithMfa: jest.fn().mockResolvedValue({ valid: true }),
      revokeRefreshTokens: jest.fn().mockResolvedValue(true)
    };

    // Mock logger
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Initialize controller with mocks
    authController = new AuthController(mockAuth0Client, mockLogger);

    // Setup routes
    app.post('/auth/login', authController.login.bind(authController));
    app.post('/auth/refresh', authController.refreshToken.bind(authController));
    app.post('/auth/logout', authController.logout.bind(authController));
    app.post('/auth/mfa/validate', authController.validateMFA.bind(authController));

    // Generate test tokens
    const payload: JWTPayload = {
      userId: TEST_USER_PROFILE.id,
      email: TEST_USER_PROFILE.email,
      role: TEST_USER_PROFILE.role,
      permissions: ['read:profiles', 'write:profiles'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    validToken = generateToken(payload);
    validRefreshToken = generateToken(payload, { expiresIn: 7200 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return 200 and valid JWT token for valid credentials with MFA', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password,
          mfaToken: '123456',
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(TEST_USER.email);
      expect(response.body.user.role).toBe(UserRole.RECRUITER);
      
      // Verify token structure
      const decodedToken = await verifyToken(response.body.token);
      expect(decodedToken).toHaveProperty('userId');
      expect(decodedToken).toHaveProperty('permissions');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_USER.email,
          password: 'wrongpassword',
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 when MFA is required but not provided', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password,
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('mfaRequired', true);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Simulate multiple rapid requests
      const requests = Array(6).fill(null).map(() => 
        request(app)
          .post('/auth/login')
          .send({
            email: TEST_USER.email,
            password: TEST_USER.password
          })
      );

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new token pair for valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for reused refresh token', async () => {
      // Use token once
      await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      // Try to reuse the same token
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
          deviceFingerprint: TEST_USER.deviceFingerprint
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Token security violation');
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout and invalidate tokens', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({
          token: validToken,
          refreshToken: validRefreshToken
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify tokens are revoked
      const refreshAttempt = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(refreshAttempt.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({
          token: 'invalid-token',
          refreshToken: validRefreshToken
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/mfa/validate', () => {
    it('should validate MFA code successfully', async () => {
      const response = await request(app)
        .post('/auth/mfa/validate')
        .send({
          userId: TEST_USER_PROFILE.id,
          mfaToken: '123456'
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
    });

    it('should return 401 for invalid MFA code', async () => {
      const response = await request(app)
        .post('/auth/mfa/validate')
        .send({
          userId: TEST_USER_PROFILE.id,
          mfaToken: 'invalid'
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});