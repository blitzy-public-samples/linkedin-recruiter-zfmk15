import React, { useCallback, useMemo, useEffect } from 'react';
import {
  Grid,
  Typography,
  Divider,
  Chip,
  Box,
  Avatar,
  Link,
  IconButton,
  Collapse,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Paper,
  useTheme
} from '@mui/material';
import { VirtualList } from 'react-window';
import { formatDistance, format, parseISO } from 'date-fns';
import { withErrorBoundary } from 'react-error-boundary';
import { Profile, ProfileExperience, ProfileEducation } from '../../../types/profile.types';
import useResponsive from '../../../hooks/useResponsive';
import useWebSocket from '../../../hooks/useWebSocket';

// Interface for component props
interface ProfileDetailsProps {
  profile: Profile;
  showAnalysis?: boolean;
  onEdit?: (profileId: string) => void;
  onAnalysisUpdate?: (analysis: any) => void;
}

/**
 * Enhanced ProfileDetails component with real-time updates and accessibility
 */
const ProfileDetails: React.FC<ProfileDetailsProps> = React.memo(({
  profile,
  showAnalysis = true,
  onEdit,
  onAnalysisUpdate
}) => {
  const theme = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const { subscribe, unsubscribe } = useWebSocket();

  // Setup WebSocket subscription for real-time updates
  useEffect(() => {
    const handleAnalysisUpdate = (data: any) => {
      if (data.profileId === profile.id) {
        onAnalysisUpdate?.(data);
      }
    };

    subscribe('analysis.complete', handleAnalysisUpdate);
    return () => unsubscribe('analysis.complete', handleAnalysisUpdate);
  }, [profile.id, subscribe, unsubscribe, onAnalysisUpdate]);

  // Memoized profile header section
  const ProfileHeader = useMemo(() => (
    <Box
      component={Paper}
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : 'flex-start',
        gap: 2
      }}
    >
      <Avatar
        src={profile.imageUrl}
        alt={profile.fullName}
        sx={{
          width: 120,
          height: 120,
          border: `2px solid ${theme.palette.primary.main}`
        }}
      />
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {profile.fullName}
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {profile.headline}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {profile.location}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {profile.skills.slice(0, 5).map((skill) => (
            <Chip
              key={skill}
              label={skill}
              color="primary"
              variant="outlined"
              size="small"
            />
          ))}
        </Box>
      </Box>
    </Box>
  ), [profile, isMobile, theme]);

  // Experience timeline renderer
  const renderExperience = useCallback((experience: ProfileExperience) => (
    <TimelineItem key={experience.id}>
      <TimelineSeparator>
        <TimelineDot color="primary" />
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" component="h3">
            {experience.title}
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            {experience.companyName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {format(parseISO(experience.startDate.toString()), 'MMM yyyy')} - 
            {experience.endDate 
              ? format(parseISO(experience.endDate.toString()), 'MMM yyyy')
              : 'Present'
            }
            {experience.location && ` • ${experience.location}`}
          </Typography>
          {experience.description && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {experience.description}
            </Typography>
          )}
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {experience.skills.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      </TimelineContent>
    </TimelineItem>
  ), []);

  // Education section renderer
  const renderEducation = useCallback((education: ProfileEducation) => (
    <Paper
      key={education.id}
      elevation={1}
      sx={{ p: 2, mb: 2 }}
    >
      <Typography variant="h6" component="h3">
        {education.institution}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        {education.degree}
        {education.fieldOfStudy && ` in ${education.fieldOfStudy}`}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {format(parseISO(education.startDate.toString()), 'yyyy')} - 
        {education.endDate 
          ? format(parseISO(education.endDate.toString()), 'yyyy')
          : 'Present'
        }
      </Typography>
      {education.grade && (
        <Typography variant="body2">
          Grade: {education.grade}
        </Typography>
      )}
      {education.activities.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            Activities:
          </Typography>
          <Typography variant="body2">
            {education.activities.join(', ')}
          </Typography>
        </Box>
      )}
    </Paper>
  ), []);

  return (
    <Grid container spacing={3} component="article">
      <Grid item xs={12}>
        {ProfileHeader}
      </Grid>

      <Grid item xs={12} md={8}>
        <Typography variant="h5" component="h2" gutterBottom>
          Experience
        </Typography>
        <Timeline>
          {profile.experience.map(renderExperience)}
        </Timeline>
      </Grid>

      <Grid item xs={12} md={4}>
        <Typography variant="h5" component="h2" gutterBottom>
          Education
        </Typography>
        {profile.education.map(renderEducation)}

        {showAnalysis && profile.lastAnalyzedAt && (
          <>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
              AI Analysis
            </Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last analyzed {formatDistance(
                  parseISO(profile.lastAnalyzedAt.toString()),
                  new Date(),
                  { addSuffix: true }
                )}
              </Typography>
              <Typography variant="h6" gutterBottom>
                Match Score: {profile.matchScore}%
              </Typography>
              {/* Additional analysis details would go here */}
            </Paper>
          </>
        )}
      </Grid>
    </Grid>
  );
});

// Add display name for debugging
ProfileDetails.displayName = 'ProfileDetails';

// Wrap with error boundary
export default withErrorBoundary(ProfileDetails, {
  fallback: <Typography color="error">Error loading profile details</Typography>
});