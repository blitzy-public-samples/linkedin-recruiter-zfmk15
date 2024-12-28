import React, { useCallback, useEffect, useMemo } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Divider,
  SwipeableDrawer,
  useTheme
} from '@mui/material'; // v5.14+
import { styled } from '@mui/material/styles'; // v5.14+
import { useDispatch, useSelector } from 'react-redux'; // v8.1+

// Lazy load icons for better performance
const SearchIcon = React.lazy(() => import('@mui/icons-material/Search')); // v5.14+
const PersonIcon = React.lazy(() => import('@mui/icons-material/Person'));
const AnalyticsIcon = React.lazy(() => import('@mui/icons-material/Analytics'));
const SettingsIcon = React.lazy(() => import('@mui/icons-material/Settings'));
const ChevronLeftIcon = React.lazy(() => import('@mui/icons-material/ChevronLeft'));

import { Button } from '../../common/Button/Button';
import useResponsive from '../../../hooks/useResponsive';

// Constants
const DRAWER_WIDTH = {
  desktop: 240,
  tablet: 200,
  mobile: 280,
};

const TRANSITION_DURATION = 225;

const NAVIGATION_ITEMS = [
  { title: 'Search', icon: SearchIcon, path: '/search', ariaLabel: 'Navigate to search' },
  { title: 'Profile', icon: PersonIcon, path: '/profile', ariaLabel: 'Navigate to profile' },
  { title: 'Analytics', icon: AnalyticsIcon, path: '/analytics', ariaLabel: 'Navigate to analytics' },
  { title: 'Settings', icon: SettingsIcon, path: '/settings', ariaLabel: 'Navigate to settings' }
] as const;

// Interfaces
interface SidebarProps {
  className?: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Styled Components
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'isOpen' && prop !== 'isMobile'
})<{ isOpen: boolean; isMobile: boolean }>(({ theme, isOpen, isMobile }) => ({
  width: 'auto',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  
  '& .MuiDrawer-paper': {
    width: isMobile 
      ? DRAWER_WIDTH.mobile 
      : theme.breakpoints.up('md') 
        ? DRAWER_WIDTH.desktop 
        : DRAWER_WIDTH.tablet,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
    overflowX: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    boxShadow: isOpen ? theme.shadows[8] : 'none',
    
    // Scrollbar styling
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.primary.main,
      borderRadius: '4px',
    },
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    '& .MuiDrawer-paper': {
      borderRight: '1px solid ButtonText',
    },
  },
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shorter,
  }),
  
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
    '& .MuiListItemIcon-root': {
      color: 'inherit',
    },
  },
  
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

// Main Component
const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  className, 
  onNavigate, 
  isOpen, 
  onToggle 
}) => {
  const theme = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const dispatch = useDispatch();
  const currentPath = useSelector((state: any) => state.router.location.pathname);

  // Handle navigation with keyboard support
  const handleNavigation = useCallback((path: string) => {
    onNavigate(path);
    if (isMobile) {
      onToggle();
    }
  }, [isMobile, onNavigate, onToggle]);

  // Handle swipe gestures for mobile
  const handleSwipe = useCallback(() => {
    if (isMobile) {
      onToggle();
    }
  }, [isMobile, onToggle]);

  // Focus management
  useEffect(() => {
    if (isOpen && !isMobile) {
      const firstNavItem = document.querySelector('[role="navigation"] button');
      if (firstNavItem instanceof HTMLElement) {
        firstNavItem.focus();
      }
    }
  }, [isOpen, isMobile]);

  // Memoize drawer content
  const drawerContent = useMemo(() => (
    <>
      <List role="navigation" aria-label="Main navigation">
        {NAVIGATION_ITEMS.map(({ title, icon: Icon, path, ariaLabel }) => (
          <StyledListItem
            key={path}
            button
            selected={currentPath === path}
            onClick={() => handleNavigation(path)}
            aria-label={ariaLabel}
            aria-current={currentPath === path ? 'page' : undefined}
          >
            <ListItemIcon>
              <React.Suspense fallback={null}>
                <Icon />
              </React.Suspense>
            </ListItemIcon>
            <ListItemText primary={title} />
          </StyledListItem>
        ))}
      </List>
      <Divider />
      <Button
        onClick={onToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        startIcon={
          <React.Suspense fallback={null}>
            <ChevronLeftIcon />
          </React.Suspense>
        }
        sx={{ margin: theme.spacing(2) }}
      >
        {isOpen ? 'Collapse' : 'Expand'}
      </Button>
    </>
  ), [currentPath, handleNavigation, isOpen, onToggle, theme]);

  // Render appropriate drawer variant based on viewport
  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="left"
        open={isOpen}
        onClose={onToggle}
        onOpen={handleSwipe}
        className={className}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH.mobile,
          },
        }}
      >
        {drawerContent}
      </SwipeableDrawer>
    );
  }

  return (
    <StyledDrawer
      variant="permanent"
      open={isOpen}
      isOpen={isOpen}
      isMobile={isMobile}
      className={className}
      aria-label="Application sidebar"
    >
      {drawerContent}
    </StyledDrawer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;