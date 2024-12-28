import React, { useCallback } from 'react';
import { Button as MuiButton, CircularProgress, ButtonProps } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';

// @mui/material version 5.14+
// react version 18.0+

interface CustomButtonProps extends ButtonProps {
  /**
   * Controls the loading state of the button
   */
  loading?: boolean;
  /**
   * Text to be announced by screen readers during loading
   */
  loadingText?: string;
  /**
   * Icon to be displayed before the button text
   */
  startIcon?: React.ReactNode;
  /**
   * Icon to be displayed after the button text
   */
  endIcon?: React.ReactNode;
  /**
   * Click handler for the button
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Accessible label for the button
   */
  ariaLabel?: string;
  /**
   * Accessible label for loading state
   */
  loadingAriaLabel?: string;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  // Base styles
  minHeight: '44px', // Mobile-optimized touch target
  transition: theme.transitions.create(
    ['background-color', 'box-shadow', 'border-color', 'opacity'],
    {
      duration: 300,
      easing: theme.transitions.easing.easeInOut,
    }
  ),
  
  // Focus styles
  '&.MuiButton-focusVisible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  
  // Variant-specific styles
  '&.MuiButton-contained': {
    boxShadow: theme.shadows[2],
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  },
  
  // Loading state styles
  '&.loading': {
    opacity: 0.8,
    pointerEvents: 'none',
  },
  
  // Disabled state styles
  '&.Mui-disabled': {
    opacity: 0.6,
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
  
  // High contrast mode support
  '@media (forced-colors: active)': {
    '&:focus': {
      outline: '2px solid ButtonText',
    },
  },
  
  // Custom ripple effect
  '& .MuiTouchRipple-root': {
    color: theme.palette.primary.light,
  },
  
  // Progress indicator positioning
  '& .MuiCircularProgress-root': {
    marginRight: theme.spacing(1),
    color: 'inherit',
  },
}));

/**
 * Enhanced button component with loading states and accessibility features.
 * Implements Material Design 3.0 guidelines and WCAG 2.1 AA compliance.
 */
const Button: React.FC<CustomButtonProps> = ({
  children,
  loading = false,
  loadingText = 'Loading, please wait',
  startIcon,
  endIcon,
  onClick,
  disabled = false,
  ariaLabel,
  loadingAriaLabel,
  className,
  ...props
}) => {
  const theme = useTheme();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault();
        return;
      }

      // Provide haptic feedback if available
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }

      onClick?.(event);
    },
    [loading, disabled, onClick]
  );

  const buttonProps = {
    ...props,
    onClick: handleClick,
    disabled: disabled || loading,
    className: `${className || ''} ${loading ? 'loading' : ''}`,
    'aria-label': ariaLabel,
    'aria-busy': loading,
    'aria-live': loading ? 'polite' : 'off',
    'aria-disabled': disabled || loading,
  };

  if (loading) {
    buttonProps['aria-label'] = loadingAriaLabel || loadingText;
  }

  return (
    <StyledButton {...buttonProps}>
      {loading && (
        <CircularProgress
          size={20}
          thickness={4}
          aria-hidden="true"
        />
      )}
      {!loading && startIcon}
      {children}
      {!loading && endIcon}
    </StyledButton>
  );
};

export default Button;