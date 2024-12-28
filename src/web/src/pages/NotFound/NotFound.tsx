import React from 'react';
import { Box, Typography } from '@mui/material'; // v5.14+
import { useNavigate } from 'react-router-dom'; // v6.0+
import { useTranslation } from 'react-i18next'; // v12.0+

// Internal imports
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import Button from '../../components/common/Button/Button';

// Styled component for content container with responsive layout
const ContentContainer = Box;

/**
 * NotFound component that provides a user-friendly 404 error page
 * Implements Material Design 3.0 guidelines with comprehensive accessibility
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  /**
   * Handles navigation back to home page with focus management
   */
  const handleNavigateHome = () => {
    navigate('/');
  };

  return (
    <MainLayout>
      <ContentContainer
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: theme => `calc(100vh - ${theme.spacing(16)})`,
          textAlign: 'center',
          p: { xs: 2, sm: 3, md: 4 },
          role: 'main',
          '&:focus': {
            outline: 'none',
          },
          '&:focus-visible': {
            outline: theme => `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px',
          },
        }}
        tabIndex={-1} // For focus management
        role="main"
        aria-labelledby="not-found-title"
      >
        {/* Error Status */}
        <Typography
          variant="h1"
          component="h1"
          id="not-found-title"
          sx={{
            fontSize: { xs: '4rem', sm: '6rem' },
            fontWeight: 700,
            color: 'primary.main',
            mb: 2,
          }}
          aria-live="polite"
        >
          404
        </Typography>

        {/* Error Message */}
        <Typography
          variant="h4"
          component="h2"
          sx={{
            mb: 3,
            color: 'text.primary',
            fontWeight: 500,
          }}
        >
          {t('common.errors.notFound')}
        </Typography>

        {/* Error Description */}
        <Typography
          variant="body1"
          sx={{
            mb: 4,
            color: 'text.secondary',
            maxWidth: '600px',
          }}
        >
          {t('common.errors.pageNotFoundDescription')}
        </Typography>

        {/* Navigation Button */}
        <Button
          onClick={handleNavigateHome}
          variant="contained"
          color="primary"
          size="large"
          aria-label={t('common.buttons.backToHome')}
          startIcon={null}
          sx={{
            minWidth: 200,
            height: 48,
            fontSize: '1rem',
          }}
        >
          {t('common.buttons.backToHome')}
        </Button>
      </ContentContainer>
    </MainLayout>
  );
};

export default NotFound;