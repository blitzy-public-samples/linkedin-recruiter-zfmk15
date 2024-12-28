/**
 * @file Enhanced Redux auth slice with comprehensive security features
 * @version 1.0.0
 * @description Implements secure authentication state management with JWT tokens,
 * role-based access control, and security monitoring integration
 * 
 * Dependencies:
 * - @reduxjs/toolkit: ^1.9.0
 * - @auth0/auth0-spa-js: ^2.1.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '../../services/auth.service';
import { Types } from '../../types/auth.types';
import { logError, ErrorSeverity } from '../../utils/errorHandling';

// Enhanced interface for auth state with security features
interface AuthState {
  isAuthenticated: boolean;
  user: Types.UserProfile | null;
  loading: boolean;
  error: Types.AuthError | null;
  lastAttempt: Date | null;
  failedAttempts: number;
  securityFlags: SecurityFlags;
  sessionExpiry: Date | null;
}

// Security status flags for enhanced monitoring
interface SecurityFlags {
  isLocked: boolean;
  requiresMfa: boolean;
  suspiciousActivity: boolean;
  tokenRefreshRequired: boolean;
}

// Initial state with security defaults
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  lastAttempt: null,
  failedAttempts: 0,
  securityFlags: {
    isLocked: false,
    requiresMfa: false,
    suspiciousActivity: false,
    tokenRefreshRequired: false
  },
  sessionExpiry: null
};

// Maximum failed login attempts before lockout
const MAX_FAILED_ATTEMPTS = 3;

// Enhanced async thunk for secure login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: Types.LoginRequest, { rejectWithValue }) => {
    try {
      const authService = AuthService.getInstance();
      const response = await authService.login(credentials);

      // Log successful authentication
      logError(
        new Error('Login successful'),
        'Authentication',
        {
          securityContext: {
            userId: response.user.id,
            role: response.user.role,
            timestamp: new Date().toISOString()
          }
        }
      );

      return response;
    } catch (error) {
      // Enhanced error handling with security logging
      logError(error as Error, 'Login Failed', {
        securityContext: {
          email: credentials.email,
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.HIGH
        }
      });
      return rejectWithValue(error);
    }
  }
);

// Async thunk for secure token refresh
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const authService = AuthService.getInstance();
      await authService.refreshToken();
    } catch (error) {
      logError(error as Error, 'Token Refresh Failed', {
        severity: ErrorSeverity.HIGH
      });
      return rejectWithValue(error);
    }
  }
);

// Async thunk for secure session validation
export const validateSession = createAsyncThunk(
  'auth/validateSession',
  async (_, { rejectWithValue }) => {
    try {
      const authService = AuthService.getInstance();
      return await authService.validateSession();
    } catch (error) {
      logError(error as Error, 'Session Validation Failed', {
        severity: ErrorSeverity.MEDIUM
      });
      return rejectWithValue(error);
    }
  }
);

// Enhanced auth slice with security features
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Reset auth state securely
    resetState: (state) => {
      Object.assign(state, initialState);
    },

    // Update security flags
    updateSecurityFlags: (state, action: PayloadAction<Partial<SecurityFlags>>) => {
      state.securityFlags = {
        ...state.securityFlags,
        ...action.payload
      };
    },

    // Record failed login attempt
    recordFailedAttempt: (state) => {
      state.failedAttempts += 1;
      state.lastAttempt = new Date();
      
      // Auto-lock account after max attempts
      if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        state.securityFlags.isLocked = true;
        logError(
          new Error('Account locked due to failed attempts'),
          'Authentication',
          { severity: ErrorSeverity.HIGH }
        );
      }
    },

    // Clear security flags
    clearSecurityFlags: (state) => {
      state.securityFlags = initialState.securityFlags;
      state.failedAttempts = 0;
      state.lastAttempt = null;
    }
  },
  extraReducers: (builder) => {
    // Login action handlers
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.loading = false;
        state.error = null;
        state.failedAttempts = 0;
        state.sessionExpiry = new Date(Date.now() + action.payload.expiresIn * 1000);
        state.securityFlags.tokenRefreshRequired = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as Types.AuthError;
        state.isAuthenticated = false;
        state.user = null;
      })

      // Token refresh handlers
      .addCase(refreshToken.pending, (state) => {
        state.securityFlags.tokenRefreshRequired = true;
      })
      .addCase(refreshToken.fulfilled, (state) => {
        state.securityFlags.tokenRefreshRequired = false;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })

      // Session validation handlers
      .addCase(validateSession.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload;
      })
      .addCase(validateSession.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      });
  }
});

// Export actions
export const {
  resetState,
  updateSecurityFlags,
  recordFailedAttempt,
  clearSecurityFlags
} = authSlice.actions;

// Selectors with memoization
export const selectAuthState = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectSecurityFlags = (state: { auth: AuthState }) => state.auth.securityFlags;
export const selectSessionValidity = (state: { auth: AuthState }) => {
  const { sessionExpiry } = state.auth;
  if (!sessionExpiry) return false;
  return new Date(sessionExpiry) > new Date();
};

// Export reducer
export default authSlice.reducer;