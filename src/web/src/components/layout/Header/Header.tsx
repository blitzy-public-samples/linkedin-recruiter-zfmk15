/**
 * @file Enhanced Header Component with Material Design 3.0 Implementation
 * @version 1.0.0
 * @description Main application header providing navigation, user profile access,
 * and theme switching functionality with comprehensive security and accessibility features
 * 
 * Dependencies:
 * - @mui/material: ^5.14.0
 * - react: ^18.2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Menu, 
  MenuItem, 
  Drawer,
  Box,
  Typography,
  useMediaQuery
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpIcon from '@mui/icons-material/Help';
import { Button } from '../../common/Button/Button';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../types/auth.types';

// Enhanced styled components with animations and accessibility
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  position: 'fixed',
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[3],
  zIndex: theme.zIndex.drawer + 1,

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderBottom: '2px solid ButtonText',
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  minHeight: 64,
  [theme.breakpoints.down('sm')]: {
    minHeight: 56,
    padding: theme.spacing(0, 1),
  },

  // Ensure touch targets are large enough
  '& .MuiIconButton-root': {
    padding: theme.spacing(1.5),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
}));

// Interface for Header props
interface HeaderProps {
  onThemeToggle: () => void;
  isDarkMode: boolean;
  isMobile?: boolean;
  onMobileMenuToggle?: () => void;
}

/**
 * Enhanced Header component with comprehensive security and accessibility features
 */
const Header: React.FC<HeaderProps> = ({
  onThemeToggle,
  isDarkMode,
  onMobileMenuToggle,
}) => {
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, user, logout } = useAuth();
  
  // State management
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Enhanced menu handling with security checks
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!isAuthenticated) return;
    setAnchorEl(event.currentTarget);
  }, [isAuthenticated]);

  // Secure logout handler
  const handleSecureLogout = useCallback(async () => {
    try {
      setAnchorEl(null);
      setMobileMenuOpen(false);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  // Mobile menu handlers
  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
    onMobileMenuToggle?.();
  }, [onMobileMenuToggle]);

  // Effect for notification polling
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (isAuthenticated) {
      pollInterval = setInterval(() => {
        // Implement notification polling logic here
        setNotificationCount(prev => prev);
      }, 30000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  // Render user menu items based on role
  const renderUserMenuItems = () => {
    const items = [
      <MenuItem 
        key="profile"
        onClick={() => setAnchorEl(null)}
        aria-label="View profile"
      >
        Profile
      </MenuItem>
    ];

    if (user?.role === UserRole.ADMIN) {
      items.push(
        <MenuItem 
          key="admin"
          onClick={() => setAnchorEl(null)}
          aria-label="Admin dashboard"
        >
          Admin Dashboard
        </MenuItem>
      );
    }

    items.push(
      <MenuItem 
        key="logout"
        onClick={handleSecureLogout}
        aria-label="Log out"
      >
        Logout
      </MenuItem>
    );

    return items;
  };

  return (
    <>
      <StyledAppBar position="fixed">
        <StyledToolbar>
          {isMobileView && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Open menu"
              onClick={handleMobileMenuToggle}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="h1"
            sx={{ flexGrow: 0, display: { xs: 'none', sm: 'block' } }}
          >
            LinkedIn Profile Search
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isAuthenticated && (
              <>
                <IconButton
                  color="inherit"
                  aria-label={`${notificationCount} notifications`}
                  aria-haspopup="true"
                >
                  <NotificationsIcon />
                  {notificationCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'error.main',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                      }}
                    >
                      {notificationCount}
                    </Box>
                  )}
                </IconButton>

                <IconButton
                  aria-label="Help and documentation"
                  color="inherit"
                >
                  <HelpIcon />
                </IconButton>
              </>
            )}

            <IconButton
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              color="inherit"
              onClick={onThemeToggle}
              sx={{ ml: 1 }}
            >
              {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            {isAuthenticated ? (
              <IconButton
                aria-label="Account settings"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
            ) : (
              <Button
                variant="contained"
                color="primary"
                href="/login"
                aria-label="Log in to your account"
              >
                Login
              </Button>
            )}
          </Box>
        </StyledToolbar>
      </StyledAppBar>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
      >
        {renderUserMenuItems()}
      </Menu>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <Box
          sx={{
            width: 250,
            pt: 8, // Account for AppBar height
            role: 'navigation',
            'aria-label': 'Main navigation',
          }}
        >
          {/* Implement mobile navigation items here */}
        </Box>
      </Drawer>
    </>
  );
};

export default Header;