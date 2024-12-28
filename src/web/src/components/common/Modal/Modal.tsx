import React, { useCallback, useEffect, useRef } from 'react';
import { Modal as MuiModal, Box, Typography, IconButton, Fade } from '@mui/material'; // @mui/material version 5.14+
import { styled } from '@mui/material/styles';
import { Close } from '@mui/icons-material'; // @mui/icons-material version 5.14+
import Button from '../Button/Button';

// Styled components with Material Design 3.0 specifications
const StyledModal = styled(MuiModal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  
  // Enhanced backdrop with blur effect
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    transition: theme.transitions.create('opacity'),
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    '& .MuiBackdrop-root': {
      backgroundColor: 'Canvas',
    },
  },

  // RTL support
  '&[dir="rtl"]': {
    '& .MuiModal-closeButton': {
      right: 'auto',
      left: theme.spacing(2),
    },
  },
}));

const ModalContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[8],
  outline: 'none', // Remove default focus outline
  maxHeight: '90vh',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  
  // Responsive padding
  padding: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },

  // Focus visible styles
  '&:focus-visible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Size variants
  '&.size-small': {
    width: '100%',
    maxWidth: 400,
  },
  '&.size-medium': {
    width: '100%',
    maxWidth: 600,
  },
  '&.size-large': {
    width: '100%',
    maxWidth: 900,
  },
  '&.size-fullScreen': {
    width: '100vw',
    height: '100vh',
    maxWidth: 'none',
    maxHeight: 'none',
    margin: 0,
    borderRadius: 0,
  },
}));

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  actions?: React.ReactNode[];
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disableFocusTrap?: boolean;
  transitionDuration?: number;
  testId?: string;
  modalStyles?: React.CSSProperties;
  fullScreen?: boolean;
  onAnimationComplete?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'medium',
  actions,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  ariaLabel,
  ariaDescribedBy,
  disableFocusTrap = false,
  transitionDuration = 300,
  testId = 'modal',
  modalStyles,
  fullScreen = false,
  onAnimationComplete,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Store the element that had focus before modal opened
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Restore focus when modal closes
  useEffect(() => {
    return () => {
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, []);

  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !disableBackdropClick) {
      onClose();
    }
  }, [disableBackdropClick, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !disableEscapeKeyDown) {
      onClose();
    }

    // Handle tab key for focus trap
    if (!disableFocusTrap && event.key === 'Tab') {
      const focusableElements = contentRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements) {
        const first = focusableElements[0] as HTMLElement;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }, [disableEscapeKeyDown, disableFocusTrap, onClose]);

  return (
    <StyledModal
      open={open}
      onClose={onClose}
      closeAfterTransition
      disableAutoFocus={disableFocusTrap}
      disableEnforceFocus={disableFocusTrap}
      disableRestoreFocus={disableFocusTrap}
      aria-labelledby={`${testId}-title`}
      aria-describedby={ariaDescribedBy || `${testId}-description`}
      data-testid={testId}
    >
      <Fade 
        in={open} 
        timeout={transitionDuration}
        onEntered={() => {
          contentRef.current?.focus();
          onAnimationComplete?.();
        }}
      >
        <ModalContent
          ref={contentRef}
          className={`size-${fullScreen ? 'fullScreen' : size}`}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          style={modalStyles}
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <IconButton
            aria-label="Close modal"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary',
            }}
            className="MuiModal-closeButton"
          >
            <Close />
          </IconButton>

          {/* Title */}
          <Typography
            id={`${testId}-title`}
            variant="h6"
            component="h2"
            gutterBottom
            sx={{ pr: 4 }}
          >
            {title}
          </Typography>

          {/* Content */}
          <Box id={`${testId}-description`}>
            {children}
          </Box>

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                mt: 4,
              }}
            >
              {actions.map((action, index) => (
                <React.Fragment key={index}>
                  {action}
                </React.Fragment>
              ))}
            </Box>
          )}
        </ModalContent>
      </Fade>
    </StyledModal>
  );
};

export default Modal;