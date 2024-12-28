import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Skeleton, Alert } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

// Internal imports
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard/AnalyticsDashboard';
import useAuth from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';
import { logError, ErrorSeverity } from '../../utils/errorHandling';

// Interface for access denied props
interface AccessDeniedProps {
  message: string;
  errorCode: string;
  contactSupport?: boolean;
}

// Access denied component
const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  message, 
  errorCode, 
  contactSupport = true 
}) => (
  <Alert 
    severity="error"
    sx={{ m: 2 }}
  >
    <Typography variant="h6" gutterBottom>
      Access Denied
    </Typography>
    <Typography variant="body1" gutterBottom>
      {message}
    </Typography>
    <Typography variant="caption" display="block">
      Error Code: {errorCode}
    </Typography>
    {contactSupport && (
      <Typography variant="body2" sx={{ mt: 1 }}>
        Please contact support for assistance.
      </Typography>
    )}
  </Alert>
);

// Error fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <Alert 
    severity="error" 
    sx={{ m: 2 }}
  >
    <Typography variant="h6" gutterBottom>
      Analytics Error
    </Typography>
    <Typography variant="body1">
      {error.message}
    </Typography>
  </Alert>
);

// Helper function to check user access
const checkUserAccess = (user: any, requiredPermission: string): boolean => {
  if (!user) return false;

  // Log access attempt for audit
  logError(
    new Error('Analytics access attempt'),
    'Authorization',
    {
      securityContext: {
        userId: user.id,
        role: user.role,
        requiredPermission,
        timestamp: new Date().toISOString()
      },
      severity: ErrorSeverity.LOW
    }
  );

  return [UserRole.ADMIN, UserRole.RECRUITER].includes(user.role);
};

/**
 * Analytics page component with enhanced error handling and role-based access control
 */
const Analytics: React.FC = React.memo(() => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Effect for initial loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle unauthenticated users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check user permissions
  if (!checkUserAccess(user, 'analytics.view')) {
    return (
      <MainLayout>
        <AccessDenied 
          message="You do not have permission to view analytics."
          errorCode="AUTH_403"
        />
      </MainLayout>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Box>
      </MainLayout>
    );
  }

  // Handle error logging for analytics
  const handleAnalyticsError = (error: Error) => {
    logError(error, 'Analytics Error', {
      securityContext: {
        userId: user?.id,
        role: user?.role,
        timestamp: new Date().toISOString()
      },
      severity: ErrorSeverity.HIGH
    });
  };

  return (
    <MainLayout>
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onError={handleAnalyticsError}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ mb: 3 }}
          >
            Analytics Dashboard
          </Typography>

          <AnalyticsDashboard 
            refreshInterval={30000}
            onError={handleAnalyticsError}
          />
        </Box>
      </ErrorBoundary>
    </MainLayout>
  );
});

// Set display name for debugging
Analytics.displayName = 'Analytics';

export default Analytics;