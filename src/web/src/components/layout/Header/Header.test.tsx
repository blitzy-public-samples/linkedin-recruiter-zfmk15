import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe } from 'jest-axe';
import { useMediaQuery } from '@mui/material';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import Header from './Header';

// Mock hooks and utilities
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn()
  };
});

// Mock authentication hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn()
  })
}));

// Enhanced test setup with comprehensive mocking
const setupTest = (customProps = {}, initialState = {}) => {
  // Mock theme and media query
  const mockUseMediaQuery = useMediaQuery as jest.Mock;
  mockUseMediaQuery.mockImplementation(() => false);

  // Initialize user event instance
  const user = userEvent.setup();

  // Setup mock functions
  const mockThemeToggle = vi.fn();
  const mockMobileMenuToggle = vi.fn();

  // Render component with providers and state
  const renderResult = renderWithProviders(
    <Header 
      onThemeToggle={mockThemeToggle}
      isDarkMode={false}
      onMobileMenuToggle={mockMobileMenuToggle}
      {...customProps}
    />,
    {
      preloadedState: {
        auth: {
          isAuthenticated: false,
          user: null,
          ...initialState.auth
        },
        ...initialState
      }
    }
  );

  return {
    ...renderResult,
    user,
    mockThemeToggle,
    mockMobileMenuToggle,
    mockUseMediaQuery
  };
};

describe('Header Component', () => {
  describe('Material Design Compliance', () => {
    it('should implement correct elevation hierarchy', async () => {
      const { container } = setupTest();
      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveStyle({ boxShadow: expect.stringContaining('0px') });
    });

    it('should use correct spacing system', () => {
      const { container } = setupTest();
      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toHaveStyle({ padding: expect.stringMatching(/^(8|16)px/) });
    });

    it('should implement proper typography scale', () => {
      setupTest();
      const title = screen.getByText('LinkedIn Profile Search');
      expect(title).toHaveClass('MuiTypography-h6');
    });

    it('should maintain proper touch target sizes', () => {
      const { container } = setupTest();
      const buttons = container.querySelectorAll('.MuiIconButton-root');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minSize = parseInt(styles.minHeight || '0');
        expect(minSize).toBeGreaterThanOrEqual(48); // Material Design minimum touch target
      });
    });
  });

  describe('Theme Management', () => {
    it('should toggle theme when theme button is clicked', async () => {
      const { user, mockThemeToggle } = setupTest();
      const themeButton = screen.getByLabelText(/Switch to .* mode/i);
      
      await user.click(themeButton);
      expect(mockThemeToggle).toHaveBeenCalledTimes(1);
    });

    it('should display correct theme icon based on current theme', () => {
      const { rerender } = setupTest({ isDarkMode: false });
      expect(screen.getByTestId('Brightness4Icon')).toBeInTheDocument();

      rerender(<Header isDarkMode={true} onThemeToggle={vi.fn()} />);
      expect(screen.getByTestId('Brightness7Icon')).toBeInTheDocument();
    });

    it('should persist theme preference', async () => {
      const { user, mockThemeToggle } = setupTest();
      const themeButton = screen.getByLabelText(/Switch to .* mode/i);
      
      await user.click(themeButton);
      expect(localStorage.getItem('theme-preference')).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('should show mobile menu button on small screens', () => {
      const { mockUseMediaQuery } = setupTest();
      mockUseMediaQuery.mockImplementation(() => true);
      
      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toBeVisible();
    });

    it('should hide title on mobile screens', () => {
      const { mockUseMediaQuery } = setupTest();
      mockUseMediaQuery.mockImplementation(() => true);
      
      const title = screen.queryByText('LinkedIn Profile Search');
      expect(title).not.toBeVisible();
    });

    it('should handle drawer open/close on mobile', async () => {
      const { user, mockMobileMenuToggle } = setupTest();
      const { mockUseMediaQuery } = setupTest();
      mockUseMediaQuery.mockImplementation(() => true);
      
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);
      expect(mockMobileMenuToggle).toHaveBeenCalled();
    });
  });

  describe('Authentication Flows', () => {
    it('should show login button when not authenticated', () => {
      setupTest();
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('should show user menu when authenticated', () => {
      setupTest({}, {
        auth: {
          isAuthenticated: true,
          user: { role: 'RECRUITER' }
        }
      });
      expect(screen.getByLabelText('Account settings')).toBeInTheDocument();
    });

    it('should handle logout correctly', async () => {
      const mockLogout = vi.fn();
      const { user } = setupTest({}, {
        auth: {
          isAuthenticated: true,
          user: { role: 'RECRUITER' },
          logout: mockLogout
        }
      });

      const menuButton = screen.getByLabelText('Account settings');
      await user.click(menuButton);
      
      const logoutButton = screen.getByText('Logout');
      await user.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should show admin options for admin users', async () => {
      const { user } = setupTest({}, {
        auth: {
          isAuthenticated: true,
          user: { role: 'ADMIN' }
        }
      });

      const menuButton = screen.getByLabelText('Account settings');
      await user.click(menuButton);
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = setupTest();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle keyboard navigation correctly', async () => {
      const { user } = setupTest();
      const themeButton = screen.getByLabelText(/Switch to .* mode/i);
      
      await user.tab();
      expect(themeButton).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      setupTest();
      expect(screen.getByLabelText(/Switch to .* mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Log in to your account/i)).toBeInTheDocument();
    });

    it('should announce notifications correctly', async () => {
      const { rerender } = setupTest({}, {
        auth: {
          isAuthenticated: true,
          user: { role: 'RECRUITER' }
        }
      });

      const notificationButton = screen.getByLabelText(/0 notifications/i);
      expect(notificationButton).toHaveAttribute('aria-haspopup', 'true');

      // Test with notifications
      rerender(
        <Header 
          isDarkMode={false} 
          onThemeToggle={vi.fn()}
          notificationCount={5}
        />
      );
      
      expect(screen.getByLabelText(/5 notifications/i)).toBeInTheDocument();
    });
  });
});