import React from 'react'; // v18.0+
import { 
  CircularProgress, 
  LinearProgress, 
  Paper, 
  Box, 
  Typography 
} from '@mui/material'; // v5.14+
import { styled, useTheme } from '@mui/material/styles'; // v5.14+
import type { Theme } from '@mui/material/styles';

// Props interface with comprehensive customization options
interface LoadingProps {
  variant?: 'circular' | 'linear' | 'overlay';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullscreen?: boolean;
  className?: string;
  role?: 'progressbar' | 'status';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  disableBackdrop?: boolean;
}

// Styled wrapper for overlay variant with theme integration
const StyledOverlay = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'fullscreen',
})<{ fullscreen?: boolean }>(({ theme, fullscreen }) => ({
  position: fullscreen ? 'fixed' : 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: theme.zIndex.modal,
  backgroundColor: theme.palette.background.paper,
  opacity: 0.9,
  transition: theme.transitions.create(['opacity'], {
    duration: theme.transitions.duration.standard,
  }),
  ...(fullscreen && {
    width: '100vw',
    height: '100vh',
  }),
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: theme.palette.grey[900],
  }),
}));

// Helper function to get responsive size dimensions
const getSizeProps = (size: LoadingProps['size'] = 'medium', theme: Theme) => {
  const sizes = {
    small: {
      circular: 24,
      linear: 200,
      spacing: theme.spacing(1),
    },
    medium: {
      circular: 40,
      linear: 300,
      spacing: theme.spacing(2),
    },
    large: {
      circular: 56,
      linear: 400,
      spacing: theme.spacing(3),
    },
  };

  return sizes[size];
};

// Main loading component with Material Design 3.0 styling and accessibility
const Loading: React.FC<LoadingProps> = React.memo(({
  variant = 'circular',
  size = 'medium',
  message,
  fullscreen = false,
  className,
  role = 'progressbar',
  color = 'primary',
  disableBackdrop = false,
}) => {
  const theme = useTheme();
  const sizeProps = getSizeProps(size, theme);

  // Render loading indicator based on variant
  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'linear':
        return (
          <LinearProgress
            color={color}
            sx={{
              width: sizeProps.linear,
              height: Math.max(4, sizeProps.circular / 10),
            }}
            role={role}
            aria-label={message || 'Loading'}
          />
        );
      case 'overlay':
        return (
          <StyledOverlay 
            fullscreen={fullscreen} 
            elevation={4}
            className={className}
            aria-live="polite"
          >
            {!disableBackdrop && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: -1,
                }}
              />
            )}
            <CircularProgress
              color={color}
              size={sizeProps.circular}
              role={role}
              aria-label={message || 'Loading'}
            />
            {message && (
              <Typography
                variant="body1"
                sx={{ mt: sizeProps.spacing }}
                color="text.secondary"
              >
                {message}
              </Typography>
            )}
          </StyledOverlay>
        );
      case 'circular':
      default:
        return (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            className={className}
          >
            <CircularProgress
              color={color}
              size={sizeProps.circular}
              role={role}
              aria-label={message || 'Loading'}
            />
            {message && (
              <Typography
                variant="body1"
                sx={{ mt: sizeProps.spacing }}
                color="text.secondary"
              >
                {message}
              </Typography>
            )}
          </Box>
        );
    }
  };

  return renderLoadingIndicator();
});

// Display name for debugging
Loading.displayName = 'Loading';

export default Loading;