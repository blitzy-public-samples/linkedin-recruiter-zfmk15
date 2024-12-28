import React from 'react'; // v18.0+
import { Typography, IconButton, Chip, Box, Skeleton, Tooltip } from '@mui/material'; // v5.14+
import { Favorite, Share, LocationOn, Visibility } from '@mui/icons-material'; // v5.14+
import { styled, useTheme } from '@mui/material/styles'; // v5.14+

import { Profile } from '../../types/profile.types';
import Card from '../../common/Card/Card';
import { formatMetricValue } from '../../utils/analytics';

// Props interface with comprehensive configuration
interface ProfileCardProps {
  profile: Profile;
  onView: (id: string) => void;
  onFavorite: (id: string) => void;
  onShare: (id: string) => void;
  className?: string;
  isLoading?: boolean;
  testId?: string;
}

// Styled match score chip with dynamic coloring based on score
const StyledMatchScore = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'score',
})<{ score: number }>(({ theme, score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 70) return theme.palette.info.main;
    if (score >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return {
    backgroundColor: getScoreColor(score),
    color: theme.palette.common.white,
    fontWeight: 600,
    '& .MuiChip-label': {
      padding: theme.spacing(0.5, 1.5),
    },
    // High contrast mode support
    '@media (forced-colors: active)': {
      border: '1px solid currentColor',
    },
  };
});

// Memoized profile card component for performance optimization
export const ProfileCard: React.FC<ProfileCardProps> = React.memo(({
  profile,
  onView,
  onFavorite,
  onShare,
  className,
  isLoading = false,
  testId = 'profile-card',
}) => {
  const theme = useTheme();

  // Loading state skeleton
  if (isLoading) {
    return (
      <Card
        variant="outlined"
        className={className}
        testId={`${testId}-loading`}
        role="article"
        ariaLabel="Loading profile card"
      >
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} />
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
            <Skeleton variant="text" width="30%" height={24} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Skeleton variant="rectangular" width={80} height={32} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="circular" width={40} height={40} />
            </Box>
          </Box>
        </Box>
      </Card>
    );
  }

  // Format match score for display
  const formattedScore = formatMetricValue(profile.matchScore, 'percentage');

  // Keyboard interaction handlers
  const handleKeyboardAction = (
    action: (id: string) => void,
    event: React.KeyboardEvent
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action(profile.id);
    }
  };

  return (
    <Card
      variant="outlined"
      className={className}
      testId={testId}
      role="article"
      ariaLabel={`Profile card for ${profile.fullName}`}
    >
      <Box sx={{ p: 2 }}>
        {/* Profile header with proper heading hierarchy */}
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {profile.fullName}
        </Typography>

        {/* Profile headline with proper contrast */}
        {profile.headline && (
          <Typography
            variant="body1"
            color="text.secondary"
            gutterBottom
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {profile.headline}
          </Typography>
        )}

        {/* Location with icon and proper spacing */}
        {profile.location && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mt: 1,
              color: theme.palette.text.secondary,
            }}
          >
            <LocationOn
              fontSize="small"
              sx={{ mr: 0.5 }}
              aria-hidden="true"
            />
            <Typography variant="body2">
              {profile.location}
            </Typography>
          </Box>
        )}

        {/* Actions and match score with proper spacing */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 2,
          }}
        >
          {/* Match score with dynamic coloring */}
          <StyledMatchScore
            label={formattedScore}
            score={profile.matchScore}
            aria-label={`Match score: ${formattedScore}`}
          />

          {/* Action buttons with tooltips and ARIA labels */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View profile">
              <IconButton
                onClick={() => onView(profile.id)}
                onKeyDown={(e) => handleKeyboardAction(onView, e)}
                aria-label="View profile details"
                size="medium"
                color="primary"
              >
                <Visibility />
              </IconButton>
            </Tooltip>

            <Tooltip title="Add to favorites">
              <IconButton
                onClick={() => onFavorite(profile.id)}
                onKeyDown={(e) => handleKeyboardAction(onFavorite, e)}
                aria-label="Add profile to favorites"
                size="medium"
                color="primary"
              >
                <Favorite />
              </IconButton>
            </Tooltip>

            <Tooltip title="Share profile">
              <IconButton
                onClick={() => onShare(profile.id)}
                onKeyDown={(e) => handleKeyboardAction(onShare, e)}
                aria-label="Share profile"
                size="medium"
                color="primary"
              >
                <Share />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Card>
  );
});

// Display name for debugging
ProfileCard.displayName = 'ProfileCard';

export default ProfileCard;