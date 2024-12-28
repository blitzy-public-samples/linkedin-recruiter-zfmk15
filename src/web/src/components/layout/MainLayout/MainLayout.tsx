import React, { Suspense, memo, useState, useCallback } from 'react';
import { Box, Container, CircularProgress } from '@mui/material'; // v5.14+
import { useTheme, styled } from '@mui/material/styles'; // v5.14+
import { ErrorBoundary } from 'react-error-boundary'; // v4.0+

// Internal imports
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import Sidebar from '../Sidebar/Sidebar';
import useResponsive from '../../../hooks/useResponsive';

// Constants for layout measurements
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 60;
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TRANSITION_DURATION = 300;

// Interface for component props
interface MainLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideSidebar?: boolean;
  hideFooter?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

// Styled components with theme integration
const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color', 'color-scheme'], {
    duration: TRANSITION_DURATION,
    easing: theme.transitions.easing.easeInOut,
  }),
  colorScheme: theme.palette.mode === 'dark' ? 'dark' : 'light',
}));

const MainContent = styled(Container)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(3),
  transition: theme.transitions.create(['padding', 'margin'], {
    duration: TRANSITION_DURATION,
    easing: theme.transitions.easing.easeInOut,
  }),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  marginTop: HEADER_HEIGHT,
}));

// Error Fallback component
const ErrorFallback = ({ error }: { error: Error }) => (
  <Box
    role="alert"
    sx={{
      p: 3,
      m: 2,
      bgcolor: 'error.light',
      borderRadius: 1,
      color: 'error.contrastText',
    }}
  >
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
  </Box>
);

// Main Layout Component
const MainLayout: React.FC<MainLayoutProps> = memo(({
  children,
  hideHeader = false,
  hideSidebar = false,
  hideFooter = false,
  maxWidth = 'lg',
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle navigation
  const handleNavigation = useCallback((path: string) => {
    // Navigation logic here
    console.log('Navigating to:', path);
  }, []);

  // Loading fallback component
  const LoadingFallback = (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
    >
      <CircularProgress 
        aria-label="Loading content"
        role="progressbar"
      />
    </Box>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LayoutContainer>
        {!hideHeader && (
          <Header
            onThemeToggle={() => {}} // Theme toggle handler
            isDarkMode={theme.palette.mode === 'dark'}
            isMobile={isMobile}
            onMobileMenuToggle={handleSidebarToggle}
          />
        )}

        {!hideSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={handleSidebarToggle}
            onNavigate={handleNavigation}
          />
        )}

        <MainContent
          maxWidth={maxWidth}
          sx={{
            ml: {
              sm: !hideSidebar && isSidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
              xs: 0,
            },
            width: {
              sm: !hideSidebar && isSidebarOpen
                ? `calc(100% - ${SIDEBAR_WIDTH}px)`
                : '100%',
              xs: '100%',
            },
          }}
        >
          <Suspense fallback={LoadingFallback}>
            {children}
          </Suspense>
        </MainContent>

        {!hideFooter && <Footer />}
      </LayoutContainer>
    </ErrorBoundary>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;