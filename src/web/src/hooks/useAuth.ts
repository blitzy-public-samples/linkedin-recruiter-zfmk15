/**
 * @file Enhanced Authentication Hook with Security Monitoring
 * @version 1.0.0
 * @description Custom React hook providing secure authentication functionality with 
 * comprehensive security monitoring, session management, and role-based access control
 * 
 * Dependencies:
 * - react: ^18.2.0
 * - react-redux: ^8.1.0
 */

import { useDispatch, useSelector } from 'react-redux'; // v8.1+
import { useCallback, useEffect } from 'react'; // v18.2+
import { LoginRequest, UserProfile } from '../types/auth.types';
import { authActions, authSelectors } from '../store/slices/authSlice';
import { logError, ErrorSeverity } from '../utils/errorHandling';

// Constants for security monitoring
const SESSION_CHECK_INTERVAL = 60000; // 1 minute
const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_ATTEMPT_RESET = 300000; // 5 minutes

/**
 * Interface for tracking login attempts
 */
interface LoginAttemptTracker {
  count: number;
  lastAttempt: number;
  isLocked: boolean;
}

/**
 * Enhanced authentication hook with security monitoring
 * @returns Authentication state and methods
 */
export const useAuth = () => {
  const dispatch = useDispatch();

  // Select auth state with memoized selectors
  const isAuthenticated = useSelector(authSelectors.selectIsAuthenticated);
  const user = useSelector(authSelectors.selectCurrentUser);
  const loading = useSelector(authSelectors.selectAuthLoading);
  const error = useSelector(authSelectors.selectAuthError);

  // Login attempt tracking
  const loginAttempts: LoginAttemptTracker = {
    count: 0,
    lastAttempt: 0,
    isLocked: false
  };

  /**
   * Enhanced login handler with rate limiting and security monitoring
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      // Check login attempt limits
      if (loginAttempts.isLocked) {
        const timeRemaining = loginAttempts.lastAttempt + LOGIN_ATTEMPT_RESET - Date.now();
        if (timeRemaining > 0) {
          throw new Error(`Too many login attempts. Please try again in ${Math.ceil(timeRemaining / 60000)} minutes.`);
        }
        // Reset tracker after cooldown
        loginAttempts.count = 0;
        loginAttempts.isLocked = false;
      }

      // Log login attempt for security monitoring
      logError(
        new Error('Login attempt'),
        'Authentication',
        {
          securityContext: {
            email: credentials.email,
            timestamp: new Date().toISOString(),
            attemptCount: loginAttempts.count + 1
          }
        }
      );

      // Dispatch login action
      const result = await dispatch(authActions.login(credentials)).unwrap();

      // Reset login attempts on success
      loginAttempts.count = 0;
      loginAttempts.isLocked = false;

      // Log successful login
      logError(
        new Error('Login successful'),
        'Authentication',
        {
          securityContext: {
            userId: result.user.id,
            role: result.user.role,
            timestamp: new Date().toISOString()
          }
        }
      );

    } catch (error) {
      // Track failed attempt
      loginAttempts.count++;
      loginAttempts.lastAttempt = Date.now();

      if (loginAttempts.count >= MAX_LOGIN_ATTEMPTS) {
        loginAttempts.isLocked = true;
      }

      // Log failed attempt
      logError(error as Error, 'Login Failed', {
        securityContext: {
          email: credentials.email,
          attemptCount: loginAttempts.count,
          isLocked: loginAttempts.isLocked,
          severity: ErrorSeverity.HIGH
        }
      });

      throw error;
    }
  }, [dispatch]);

  /**
   * Enhanced logout handler with session cleanup
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Log logout attempt
      logError(
        new Error('Logout initiated'),
        'Authentication',
        {
          securityContext: {
            userId: user?.id,
            timestamp: new Date().toISOString()
          }
        }
      );

      await dispatch(authActions.logout()).unwrap();

      // Log successful logout
      logError(
        new Error('Logout successful'),
        'Authentication',
        {
          securityContext: {
            timestamp: new Date().toISOString()
          }
        }
      );

    } catch (error) {
      logError(error as Error, 'Logout Failed', {
        severity: ErrorSeverity.HIGH
      });
      throw error;
    }
  }, [dispatch, user]);

  /**
   * Validates user permissions against required roles
   */
  const validatePermissions = useCallback((requiredPermissions: string[]): boolean => {
    if (!user) return false;

    const hasPermission = requiredPermissions.includes(user.role);

    // Log permission check
    logError(
      new Error('Permission check'),
      'Authorization',
      {
        securityContext: {
          userId: user.id,
          role: user.role,
          requiredPermissions,
          granted: hasPermission,
          timestamp: new Date().toISOString()
        }
      }
    );

    return hasPermission;
  }, [user]);

  /**
   * Automatic session monitoring and token refresh
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      try {
        await dispatch(authActions.refreshToken()).unwrap();
      } catch (error) {
        logError(error as Error, 'Session Refresh Failed', {
          severity: ErrorSeverity.HIGH,
          securityContext: {
            userId: user?.id,
            timestamp: new Date().toISOString()
          }
        });
        // Force logout on session error
        logout();
      }
    };

    const sessionMonitor = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(sessionMonitor);
    };
  }, [isAuthenticated, dispatch, user, logout]);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    logout,
    validatePermissions
  };
};

// Type definitions for hook return value
export interface UseAuthReturn {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  error: Error | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  validatePermissions: (requiredPermissions: string[]) => boolean;
}