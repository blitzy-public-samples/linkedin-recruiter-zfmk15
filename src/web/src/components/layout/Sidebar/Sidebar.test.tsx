import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // v14.0+
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7+
import { Provider } from 'react-redux'; // v8.1+
import { ThemeProvider, useTheme } from '@mui/material/styles'; // v5.14+
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // v0.34+
import createAppTheme from '../../../config/theme.config';
import Sidebar from './Sidebar';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test constants
const TEST_INITIAL_STATE = {
  ui: {
    sidebarOpen: true,
    theme: 'light'
  },
  auth: {
    isAuthenticated: true,
    user: { role: 'recruiter' }
  },
  router: {
    location: { pathname: '/search' }
  }
};

const VIEWPORT_SIZES = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 }
};

// Mock dependencies
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector: any) => selector(TEST_INITIAL_STATE)
}));

vi.mock('../../../hooks/useResponsive', () => ({
  default: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })
}));

// Test setup utilities
const createMatchMedia = (width: number) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: width >= parseInt(query.match(/\d+/)?.[0] ?? '0'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const renderSidebar = (props = {}) => {
  const theme = createAppTheme('light');
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={TEST_INITIAL_STATE}>
        <Sidebar
          onNavigate={vi.fn()}
          isOpen={true}
          onToggle={vi.fn()}
          {...props}
        />
      </Provider>
    </ThemeProvider>
  );
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMatchMedia(VIEWPORT_SIZES.desktop.width);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render all navigation items correctly', () => {
      renderSidebar();
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should highlight the current active route', () => {
      renderSidebar();
      
      const searchItem = screen.getByText('Search').closest('li');
      expect(searchItem).toHaveClass('Mui-selected');
    });

    it('should render collapse/expand button with correct text', () => {
      const { rerender } = renderSidebar({ isOpen: true });
      
      expect(screen.getByText('Collapse')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider theme={createAppTheme('light')}>
          <Provider store={TEST_INITIAL_STATE}>
            <Sidebar
              onNavigate={vi.fn()}
              isOpen={false}
              onToggle={vi.fn()}
            />
          </Provider>
        </ThemeProvider>
      );
      
      expect(screen.getByText('Expand')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render SwipeableDrawer on mobile viewport', async () => {
      createMatchMedia(VIEWPORT_SIZES.mobile.width);
      vi.mocked(require('../../../hooks/useResponsive').default).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false
      });
      
      renderSidebar();
      
      expect(screen.getByRole('presentation')).toHaveClass('MuiDrawer-root');
      expect(screen.getByRole('presentation')).toHaveStyle({
        width: '280px' // Mobile drawer width
      });
    });

    it('should adjust width based on breakpoints', async () => {
      // Test tablet viewport
      createMatchMedia(VIEWPORT_SIZES.tablet.width);
      vi.mocked(require('../../../hooks/useResponsive').default).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false
      });
      
      const { rerender } = renderSidebar();
      
      expect(screen.getByRole('navigation').parentElement).toHaveStyle({
        width: '200px' // Tablet drawer width
      });

      // Test desktop viewport
      createMatchMedia(VIEWPORT_SIZES.desktop.width);
      vi.mocked(require('../../../hooks/useResponsive').default).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true
      });
      
      rerender(
        <ThemeProvider theme={createAppTheme('light')}>
          <Provider store={TEST_INITIAL_STATE}>
            <Sidebar
              onNavigate={vi.fn()}
              isOpen={true}
              onToggle={vi.fn()}
            />
          </Provider>
        </ThemeProvider>
      );
      
      expect(screen.getByRole('navigation').parentElement).toHaveStyle({
        width: '240px' // Desktop drawer width
      });
    });
  });

  describe('Interaction Handling', () => {
    it('should call onNavigate when clicking navigation items', async () => {
      const onNavigate = vi.fn();
      renderSidebar({ onNavigate });
      
      await userEvent.click(screen.getByText('Analytics'));
      
      expect(onNavigate).toHaveBeenCalledWith('/analytics');
    });

    it('should call onToggle when clicking collapse button', async () => {
      const onToggle = vi.fn();
      renderSidebar({ onToggle });
      
      await userEvent.click(screen.getByText('Collapse'));
      
      expect(onToggle).toHaveBeenCalled();
    });

    it('should handle swipe gestures on mobile', async () => {
      createMatchMedia(VIEWPORT_SIZES.mobile.width);
      vi.mocked(require('../../../hooks/useResponsive').default).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false
      });
      
      const onToggle = vi.fn();
      renderSidebar({ onToggle });
      
      const drawer = screen.getByRole('presentation');
      fireEvent.touchStart(drawer, { touches: [{ clientX: 0 }] });
      fireEvent.touchMove(drawer, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(drawer);
      
      await waitFor(() => {
        expect(onToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderSidebar();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderSidebar();
      
      const navigation = screen.getByRole('navigation');
      const firstItem = within(navigation).getAllByRole('button')[0];
      
      firstItem.focus();
      expect(document.activeElement).toBe(firstItem);
      
      await userEvent.keyboard('{Tab}');
      const secondItem = within(navigation).getAllByRole('button')[1];
      expect(document.activeElement).toBe(secondItem);
    });

    it('should have correct ARIA attributes', () => {
      renderSidebar();
      
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
      
      const currentItem = screen.getByText('Search').closest('li');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
      
      const collapseButton = screen.getByText('Collapse');
      expect(collapseButton).toHaveAttribute('aria-label', 'Close sidebar');
    });
  });
});