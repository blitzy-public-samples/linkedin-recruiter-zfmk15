import React, { Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // v6.0+
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material'; // v5.14+
import { Analytics } from '@segment/analytics-next'; // v1.51+

// Internal imports
import MainLayout from './components/layout/MainLayout/MainLayout';
import createAppTheme from './config/theme.config';
import { useAuth } from './hooks/useAuth';
import { logError, ErrorSeverity } from './utils/errorHandling';

// Lazy-loaded components for code splitting
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Constants
const PROTECTED_ROUTES = ['/dashboard', '/search', '/profile', '/analytics', '/settings'];
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

// Initialize analytics
const analytics = new Analytics({
  writeKey: process.env.VITE_SEGMENT_WRITE_KEY || '',
});

/**
 * Enhanced root application component with security, accessibility, and performance features
 */
const App: React.FC = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const { isAuthenticated, validatePermissions } = useAuth();

  // Create theme based on system preference
  const theme = useMemo(
    () => createAppTheme(prefersDarkMode ? 'dark' : 'light'),
    [prefersDarkMode]
  );

  // Security monitoring setup
  useEffect(() => {
    const handleSecurityEvent = (event: SecurityPolicyViolationEvent) => {
      logError(
        new Error('CSP Violation'),
        'Security',
        {
          securityContext: {
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
            timestamp: new Date().toISOString(),
          },
          severity: ErrorSeverity.HIGH,
        }
      );
    };

    document.addEventListener('securitypolicyviolation', handleSecurityEvent);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleSecurityEvent);
    };
  }, []);

  // Route guard component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  };

  // Loading fallback with accessibility support
  const LoadingFallback = (
    <div
      role="progressbar"
      aria-label="Loading content"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      Loading...
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <MainLayout>
          <Suspense fallback={LoadingFallback}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected routes */}
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to search */}
              <Route
                path="/"
                element={
                  <Navigate
                    to={isAuthenticated ? '/search' : '/login'}
                    replace
                  />
                }
              />

              {/* 404 route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
};

// Analytics decorator
const withAnalytics = (WrappedComponent: React.FC) => {
  return function WithAnalyticsComponent(props: any) {
    useEffect(() => {
      analytics.page();
    }, []);

    return <WrappedComponent {...props} />;
  };
};

export default withAnalytics(App);