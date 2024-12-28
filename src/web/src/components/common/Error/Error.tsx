import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AlertProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import Button from '../Button/Button';
import { getErrorMessage } from '../../../utils/errorHandling';

// @mui/material version 5.14+
// react version 18.0+

/**
 * Props interface for the Error component
 */
interface ErrorProps {
  /**
   * Error object or message to display
   */
  error: Error | ApiError | string;
  /**
   * Severity level of the error
   * @default 'error'
   */
  severity?: 'error' | 'warning' | 'info';
  /**
   * Callback function for retry action
   */
  onRetry?: () => Promise<void> | void;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * ARIA role override
   * @default 'alert'
   */
  role?: string;
}

/**
 * Styled Alert component with enhanced accessibility and theme integration
 */
const StyledAlert = styled(Alert)(({ theme }) => ({
  // Base styles
  width: '100%',
  maxWidth: '600px',
  margin: theme.spacing(1, 0),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  
  // Typography
  '& .MuiAlert-message': {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body1.fontSize,
    lineHeight: theme.typography.body1.lineHeight,
  },

  // Elevation and shadows
  boxShadow: theme.shadows[2],
  
  // Focus styles for keyboard navigation
  '&:focus-visible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Responsive adjustments
  [theme.breakpoints.down('sm')]: {
    maxWidth: '100%',
    margin: theme.spacing(1),
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderWidth: '2px',
    borderStyle: 'solid',
  },

  // Animation for mount/unmount
  transition: theme.transitions.create(['opacity', 'transform'], {
    duration: theme.transitions.duration.short,
  }),

  // RTL support
  '& .MuiAlert-icon': {
    marginRight: theme.direction === 'rtl' ? 0 : theme.spacing(2),
    marginLeft: theme.direction === 'rtl' ? theme.spacing(2) : 0,
  },
}));

/**
 * Error component for displaying error messages with enhanced accessibility
 * and error handling capabilities.
 */
const Error: React.FC<ErrorProps> = ({
  error,
  severity = 'error',
  onRetry,
  className,
  role = 'alert',
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Format error message on mount or when error changes
  useEffect(() => {
    setErrorMessage(getErrorMessage(error, { includeContext: true }));
  }, [error]);

  // Handle retry action with loading state
  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    try {
      setIsRetrying(true);
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  return (
    <StyledAlert
      severity={severity}
      className={className}
      role={role}
      aria-live="polite"
      action={
        onRetry && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleRetry}
            loading={isRetrying}
            loadingText="Retrying..."
            aria-label="Retry action"
          >
            Retry
          </Button>
        )
      }
    >
      {errorMessage}
    </StyledAlert>
  );
};

export default Error;