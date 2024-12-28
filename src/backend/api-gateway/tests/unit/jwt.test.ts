import { describe, it, expect, beforeEach, afterEach, jest } from 'jest'; // v29.0.0
import { sign, decode } from 'jsonwebtoken'; // v9.0.0
import { generateToken, verifyToken, decodeToken } from '../../src/utils/jwt.utils';
import { JWTPayload, UserRole } from '../../src/types/auth.types';
import { authConfig } from '../../src/config/auth.config';

describe('JWT Utilities', () => {
  // Mock valid payload for testing
  const mockPayload: JWTPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.RECRUITER,
    permissions: ['read:profiles', 'write:searches'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  // Mock tokens for testing
  let mockValidToken: string;
  let mockExpiredToken: string;
  let mockInvalidToken: string;
  let mockAuth0Token: string;

  beforeEach(() => {
    // Create a valid token before each test
    mockValidToken = `Bearer ${sign(mockPayload, authConfig.jwt.secret, {
      algorithm: authConfig.jwt.algorithm,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience
    })}`;

    // Create an expired token
    mockExpiredToken = `Bearer ${sign(
      { ...mockPayload, exp: Math.floor(Date.now() / 1000) - 3600 },
      authConfig.jwt.secret
    )}`;

    // Create an invalid token
    mockInvalidToken = 'Bearer invalid.token.signature';

    // Create a mock Auth0 token
    mockAuth0Token = `Bearer ${sign(
      {
        ...mockPayload,
        iss: authConfig.auth0.domain,
        aud: authConfig.auth0.audience
      },
      authConfig.jwt.secret
    )}`;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with correct payload', () => {
      const token = generateToken(mockPayload);
      expect(token).toBeTruthy();
      
      const decoded = decode(token) as JWTPayload;
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should include Auth0-specific claims when configured', () => {
      const token = generateToken(mockPayload, {
        issuer: authConfig.auth0.domain,
        audience: authConfig.auth0.audience
      });
      
      const decoded = decode(token) as JWTPayload;
      expect(decoded.iss).toBe(authConfig.auth0.domain);
      expect(decoded.aud).toBe(authConfig.auth0.audience);
    });

    it('should throw error for invalid payload', () => {
      const invalidPayload = { ...mockPayload, userId: undefined };
      expect(() => generateToken(invalidPayload as JWTPayload)).toThrow('Invalid payload');
    });

    it('should respect custom expiration time', () => {
      const customExp = 7200; // 2 hours
      const token = generateToken(mockPayload, { expiresIn: customExp });
      const decoded = decode(token) as JWTPayload;
      
      expect(decoded.exp! - decoded.iat!).toBe(customExp);
    });

    it('should include configured permissions in token', () => {
      const token = generateToken(mockPayload);
      const decoded = decode(token) as JWTPayload;
      
      expect(decoded.permissions).toEqual(mockPayload.permissions);
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid token', async () => {
      const result = await verifyToken(mockValidToken);
      expect(result).toMatchObject(mockPayload);
    });

    it('should verify Auth0 tokens with correct issuer and audience', async () => {
      const result = await verifyToken(mockAuth0Token, {
        issuer: authConfig.auth0.domain,
        audience: authConfig.auth0.audience
      });
      expect(result).toMatchObject(mockPayload);
    });

    it('should reject expired tokens', async () => {
      await expect(verifyToken(mockExpiredToken))
        .rejects
        .toThrow('Token has expired');
    });

    it('should reject tokens with invalid signatures', async () => {
      await expect(verifyToken(mockInvalidToken))
        .rejects
        .toThrow('Token validation failed');
    });

    it('should reject tokens with missing required claims', async () => {
      const tokenWithMissingClaims = `Bearer ${sign(
        { email: mockPayload.email }, // Missing userId and role
        authConfig.jwt.secret
      )}`;
      
      await expect(verifyToken(tokenWithMissingClaims))
        .rejects
        .toThrow('Token payload missing required claims');
    });

    it('should reject tokens with invalid format', async () => {
      await expect(verifyToken('invalid-format'))
        .rejects
        .toThrow('Invalid token format');
    });

    it('should validate role-based permissions', async () => {
      const result = await verifyToken(mockValidToken);
      expect(result.role).toBe(UserRole.RECRUITER);
      expect(result.permissions).toContain('read:profiles');
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token payload', () => {
      const result = decodeToken(mockValidToken);
      expect(result).toMatchObject(mockPayload);
    });

    it('should handle tokens without Bearer prefix', () => {
      const tokenWithoutBearer = mockValidToken.replace('Bearer ', '');
      const result = decodeToken(tokenWithoutBearer);
      expect(result).toMatchObject(mockPayload);
    });

    it('should throw error for malformed tokens', () => {
      expect(() => decodeToken('malformed.token'))
        .toThrow('Token decoding failed');
    });

    it('should throw error for invalid token format', () => {
      expect(() => decodeToken(''))
        .toThrow('Invalid token format');
    });

    it('should decode and validate Auth0 specific claims', () => {
      const result = decodeToken(mockAuth0Token);
      expect(result.iss).toBe(authConfig.auth0.domain);
      expect(result.aud).toBe(authConfig.auth0.audience);
    });

    it('should maintain type safety for decoded payload', () => {
      const result = decodeToken(mockValidToken);
      expect(typeof result.userId).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(Object.values(UserRole)).toContain(result.role);
      expect(Array.isArray(result.permissions)).toBe(true);
    });
  });
});