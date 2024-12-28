import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Skeleton, 
  Alert 
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';

// Internal imports
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard/AnalyticsDashboard';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';

// Styled components
const WelcomeSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  transition: theme.transitions.create(['box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const ResponsiveGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
  '& .MuiGrid-item': {
    display: 'flex',
    flexDirection: 'column',
  },
}));

// Analytics state interface
interface AnalyticsState {
  screeningTimeReduction: number;
  matchAccuracy: number;
  costReduction: number;
  profilesProcessed: number;
  lastUpdated: Date;
}

/**
 * Main dashboard page component with real-time analytics
 * Implements requirements from sections 1.2 and 6.2 of technical specifications
 */
const Dashboard: React.FC = React.memo(() => {
  const theme = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const [error, setError] = useState<Error | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsState>({
    screeningTimeReduction: 0,
    matchAccuracy: 0,
    costReduction: 0,
    profilesProcessed: 0,
    lastUpdated: new Date()
  });

  // Handle real-time analytics updates
  const handleAnalyticsUpdate = useCallback((data: any) => {
    setAnalytics(prevState => ({
      ...prevState,
      ...data,
      lastUpdated: new Date()
    }));
  }, []);

  // Setup WebSocket subscription for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    subscribe('analytics.update', handleAnalyticsUpdate, {
      retryOnError: true,
      maxRetries: 3,
      onError: (wsError) => {
        setError(new Error(wsError.message));
      }
    });

    return () => {
      unsubscribe('analytics.update', handleAnalyticsUpdate);
    };
  }, [isConnected, subscribe, unsubscribe, handleAnalyticsUpdate]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Box
        component="main"
        role="main"
        aria-label="Dashboard"
      >
        {/* Welcome Section */}
        <WelcomeSection>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 500 }}
          >
            Welcome back, {user?.firstName || 'User'}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
          >
            Here's an overview of your recruitment analytics and key metrics
          </Typography>
        </WelcomeSection>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mb: 3 }}
          >
            {error.message}
          </Alert>
        )}

        {/* Analytics Dashboard */}
        <ResponsiveGrid container spacing={3}>
          <Grid item xs={12}>
            <AnalyticsDashboard
              refreshInterval={30000}
              onError={(error) => setError(error)}
            />
          </Grid>
        </ResponsiveGrid>
      </Box>
    </MainLayout>
  );
});

// Set display name for debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard;