import React from 'react'; // v18.0+
import { Card as MuiCard, CardContent, CardActions, CardMedia } from '@mui/material'; // v5.14+
import { styled, useTheme } from '@mui/material/styles'; // v5.14+

// Interface for media content configuration
interface CardMediaConfig {
  src: string;
  alt: string;
  height?: number;
  loading?: 'lazy' | 'eager';
}

// Props interface with comprehensive configuration options
export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  elevation?: number;
  media?: CardMediaConfig;
  actions?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  role?: string;
  ariaLabel?: string;
  tabIndex?: number;
  testId?: string;
}

// Styled wrapper for MUI Card with enhanced accessibility and interaction states
const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant?: string }>(({ theme, variant }) => ({
  position: 'relative',
  transition: theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  // Base styles
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  
  // Variant-specific styles
  ...(variant === 'elevated' && {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    '&:hover': {
      boxShadow: theme.shadows[2],
      transform: 'translateY(-2px)',
    },
  }),
  
  ...(variant === 'outlined' && {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
  }),
  
  ...(variant === 'filled' && {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
    },
  }),

  // Focus states for accessibility
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },

  // RTL support
  [theme.direction === 'rtl' ? 'marginLeft' : 'marginRight']: theme.spacing(2),
}));

// Main Card component with comprehensive accessibility support
export const Card: React.FC<CardProps> = React.memo(({
  children,
  variant = 'elevated',
  elevation = 1,
  media,
  actions,
  className,
  onClick,
  role = 'article',
  ariaLabel,
  tabIndex = 0,
  testId = 'card-component',
}) => {
  const theme = useTheme();

  // Keyboard interaction handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent);
    }
  };

  return (
    <StyledCard
      variant={variant}
      elevation={variant === 'elevated' ? elevation : 0}
      className={className}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role}
      aria-label={ariaLabel}
      tabIndex={onClick ? tabIndex : -1}
      data-testid={testId}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Media section with lazy loading and error handling */}
      {media && (
        <CardMedia
          component="img"
          height={media.height || 200}
          image={media.src}
          alt={media.alt}
          loading={media.loading || 'lazy'}
          sx={{
            borderTopLeftRadius: theme.shape.borderRadius,
            borderTopRightRadius: theme.shape.borderRadius,
            objectFit: 'cover',
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null; // Prevent infinite error loop
            target.src = 'path/to/fallback-image.jpg'; // Replace with actual fallback image
          }}
        />
      )}

      {/* Main content with proper spacing */}
      <CardContent
        sx={{
          padding: theme.spacing(2),
          '&:last-child': {
            paddingBottom: actions ? theme.spacing(1) : theme.spacing(2),
          },
        }}
      >
        {children}
      </CardContent>

      {/* Action buttons section */}
      {actions && (
        <CardActions
          sx={{
            padding: theme.spacing(2),
            paddingTop: theme.spacing(1),
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </CardActions>
      )}
    </StyledCard>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export default Card;