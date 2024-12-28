/**
 * @file Profile Page Component v1.0.0
 * @description Displays detailed LinkedIn profile information with real-time updates
 * and AI-powered analysis. Implements Material Design 3.0 and WCAG 2.1 AA standards.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Button,
  Skeleton
} from '@mui/material'; // v5.14.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { Profile, ProfileAnalysis } from '../../types/profile.types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { logError, ErrorSeverity } from '../../utils/errorHandling';
import { apiService } from '../../services/api.service';
import { ENDPOINTS } from '../../config/api.config';

// Interface for URL parameters
interface ProfilePageParams {
  profileId: string;
}

// Interface for WebSocket messages
interface WebSocketMessage {
  type: string;
  payload: any;
}

/**
 * Enhanced Profile page component with real-time updates and accessibility
 */
const ProfilePage: React.FC = React.memo(() => {
  // Router hooks
  const { profileId } = useParams<ProfilePageParams>();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // WebSocket connection for real-time updates
  const { isConnected, subscribe, unsubscribe } = useWebSocket();

  /**
   * Fetches profile data with error handling and security monitoring
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.get<Profile>(`${ENDPOINTS.PROFILES.GET.replace(':id', profileId!)}`);
      setProfile(data);
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to fetch profile data';
      setError(new Error(errorMessage));
      logError(err as Error, errorMessage, {
        securityContext: {
          profileId,
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.HIGH
        }
      });
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  /**
   * Handles real-time profile analysis updates
   */
  const handleAnalysisUpdate = useCallback((message: WebSocketMessage) => {
    if (message.type === 'analysis.complete' && message.payload.profileId === profileId) {
      setAnalysis(message.payload.analysis);
      setRefreshing(false);
    }
  }, [profileId]);

  /**
   * Triggers a new profile analysis with loading state
   */
  const handleRefreshAnalysis = useCallback(async () => {
    try {
      setRefreshing(true);
      await apiService.post(`${ENDPOINTS.PROFILES.ANALYZE.replace(':id', profileId!)}`, {
        forceRefresh: true
      });
    } catch (err) {
      setRefreshing(false);
      logError(err as Error, 'Failed to refresh analysis', {
        securityContext: {
          profileId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [profileId]);

  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    if (!isConnected || !profileId) return;

    subscribe('analysis.complete', handleAnalysisUpdate, {
      retryOnError: true,
      maxRetries: 3,
      onError: (error) => {
        logError(error, 'WebSocket subscription error', {
          severity: ErrorSeverity.MEDIUM
        });
      }
    });

    return () => {
      unsubscribe('analysis.complete', handleAnalysisUpdate);
    };
  }, [isConnected, profileId, subscribe, unsubscribe, handleAnalysisUpdate]);

  // Initial data fetch
  useEffect(() => {
    if (!profileId) {
      navigate('/search', { replace: true });
      return;
    }
    fetchProfile();
  }, [profileId, navigate, fetchProfile]);

  // Memoized profile sections for performance
  const profileSections = useMemo(() => {
    if (!profile) return null;

    return (
      <Grid container spacing={3}>
        {/* Profile Header */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            {profile.fullName}
          </Typography>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {profile.headline}
          </Typography>
        </Grid>

        {/* Experience Section */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" component="h2" gutterBottom>
            Experience
          </Typography>
          {profile.experience.map((exp) => (
            <Box key={exp.id} mb={3}>
              <Typography variant="h6">{exp.title}</Typography>
              <Typography color="textSecondary">
                {exp.companyName} • {new Date(exp.startDate).getFullYear()} - 
                {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}
              </Typography>
              <Typography>{exp.description}</Typography>
            </Box>
          ))}
        </Grid>

        {/* Analysis Section */}
        <Grid item xs={12} md={4}>
          <Box bgcolor="background.paper" p={3} borderRadius={1}>
            <Typography variant="h5" component="h2" gutterBottom>
              AI Analysis
              <Button
                onClick={handleRefreshAnalysis}
                disabled={refreshing}
                size="small"
                sx={{ ml: 2 }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Typography>
            {analysis ? (
              <>
                <Box display="flex" alignItems="center" mb={2}>
                  <CircularProgress
                    variant="determinate"
                    value={analysis.overallScore}
                    size={60}
                    thickness={4}
                  />
                  <Typography variant="h6" ml={2}>
                    {analysis.overallScore}% Match
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Last analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
                </Typography>
              </>
            ) : (
              <Skeleton variant="rectangular" height={100} />
            )}
          </Box>
        </Grid>
      </Grid>
    );
  }, [profile, analysis, refreshing, handleRefreshAnalysis]);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <Alert 
      severity="error"
      action={
        <Button color="inherit" onClick={() => window.location.reload()}>
          Retry
        </Button>
      }
    >
      {error.message}
    </Alert>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {loading ? (
          <Box>
            <Skeleton variant="rectangular" height={200} />
            <Skeleton variant="text" sx={{ mt: 2 }} />
            <Skeleton variant="text" />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.message}
          </Alert>
        ) : (
          profileSections
        )}
      </Container>
    </ErrorBoundary>
  );
});

ProfilePage.displayName = 'ProfilePage';

export default ProfilePage;