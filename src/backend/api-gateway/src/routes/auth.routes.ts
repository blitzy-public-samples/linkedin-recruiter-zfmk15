// @ts-nocheck
import { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import { rateLimit } from 'express-rate-limit'; // v6.9.0

import { AuthController } from '../controllers/auth.controller';
import { authenticate, authorize, rateLimiter } from '../middleware/auth.middleware';
import { UserRole, MFAType } from '../types/auth.types';

/**
 * Configures and initializes authentication routes with comprehensive security features
 * Implements OAuth 2.0, JWT session management, MFA, and security monitoring
 */
const router = Router();

// Apply security headers
router.use(helmet());

// Initialize auth controller
const authController = new AuthController();

// Configure rate limiters for different auth operations
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again later',
    code: 'AUTH004'
  }
});

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many MFA attempts, please try again later',
    code: 'AUTH005'
  }
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 refresh attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many token refresh attempts',
    code: 'AUTH006'
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticates user credentials and initiates MFA flow
 * @access Public
 */
router.post('/login', 
  loginLimiter,
  authController.login
);

/**
 * @route POST /api/v1/auth/mfa/validate
 * @desc Validates MFA token and completes authentication
 * @access Public
 */
router.post('/mfa/validate',
  mfaLimiter,
  authController.validateMFA
);

/**
 * @route POST /api/v1/auth/refresh-token
 * @desc Refreshes access token with sliding session
 * @access Protected
 */
router.post('/refresh-token',
  authenticate,
  refreshLimiter,
  authController.refreshToken
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Invalidates tokens and terminates session
 * @access Protected
 */
router.post('/logout',
  authenticate,
  authController.logout
);

/**
 * @route GET /api/v1/auth/validate-token
 * @desc Validates token and device fingerprint
 * @access Protected
 */
router.get('/validate-token',
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20 // 20 validations per minute
  }),
  authenticate,
  authController.validateToken
);

/**
 * @route POST /api/v1/auth/mfa/enroll
 * @desc Enrolls user in MFA with specified method
 * @access Protected
 */
router.post('/mfa/enroll',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.RECRUITER]),
  async (req, res) => {
    try {
      const { userId, mfaType } = req.body;

      if (!Object.values(MFAType).includes(mfaType)) {
        return res.status(400).json({
          error: 'Invalid MFA type specified',
          code: 'AUTH007'
        });
      }

      const enrollmentResult = await authController.enrollMFA(userId, mfaType);
      return res.status(200).json(enrollmentResult);
    } catch (error) {
      return res.status(500).json({
        error: 'MFA enrollment failed',
        code: 'AUTH008',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/mfa/disable
 * @desc Disables MFA for user (admin only)
 * @access Protected - Admin
 */
router.post('/mfa/disable',
  authenticate,
  authorize([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { userId } = req.body;
      await authController.disableMFA(userId);
      return res.status(200).json({
        message: 'MFA disabled successfully'
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to disable MFA',
        code: 'AUTH009',
        details: error.message
      });
    }
  }
);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Auth Route Error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal authentication error',
    code: err.code || 'AUTH999',
    requestId: req.id
  });
});

export default router;