import React from 'react';
import { screen, render, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useMediaQuery, useTheme } from '@mui/material';
import MainLayout from './MainLayout';
import { renderWithProviders } from '../../../../tests/utils/test-utils';

// Mock Material-UI hooks
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(),
  useTheme: jest.fn(),
}));

// Mock child components
jest.mock('../Header/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

jest.mock('../Footer/Footer', () => ({
  __esModule: true,
  default: () => <div data-testid="footer">Footer</div>,
}));

jest.mock('../Sidebar/Sidebar', () => ({
  __esModule: true,
  default: ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
    <div data-testid="sidebar" onClick={onToggle}>
      Sidebar {isOpen ? 'Open' : 'Closed'}
    </div>
  ),
}));

describe('MainLayout', () => {
  // Mock theme object
  const mockTheme = {
    palette: {
      mode: 'light',
      background: { default: '#ffffff' },
    },
    transitions: {
      create: jest.fn(),
      duration: { standard: 300 },
      easing: { easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    },
    spacing: (factor: number) => `${8 * factor}px`,
    breakpoints: {
      up: jest.fn(),
      down: jest.fn(),
    },
  };

  beforeAll(() => {
    // Configure jest-axe
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue(mockTheme);
  });

  describe('Layout Structure', () => {
    it('renders all core layout components by default', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('allows hiding optional components via props', () => {
      renderWithProviders(
        <MainLayout hideHeader hideSidebar hideFooter>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('maintains proper spacing and elevation', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const mainContent = screen.getByText('Content').closest('div');
      expect(mainContent).toHaveStyle({
        marginTop: '64px', // HEADER_HEIGHT
        padding: '24px', // theme.spacing(3)
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout for mobile viewport', async () => {
      (useMediaQuery as jest.Mock).mockReturnValue(true); // isMobile = true

      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const mainContent = screen.getByText('Content').closest('div');
      expect(mainContent).toHaveStyle({
        padding: '16px', // theme.spacing(2) for mobile
        width: '100%',
      });
    });

    it('adapts layout for tablet viewport', () => {
      (useMediaQuery as jest.Mock)
        .mockReturnValueOnce(false) // not mobile
        .mockReturnValueOnce(true); // is tablet

      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveTextContent('Sidebar Open');
    });

    it('adapts layout for desktop viewport', () => {
      (useMediaQuery as jest.Mock).mockReturnValue(false); // not mobile/tablet

      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const mainContent = screen.getByText('Content').closest('div');
      expect(mainContent).toHaveStyle({
        width: 'calc(100% - 240px)', // Full width minus SIDEBAR_WIDTH
      });
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors and transitions correctly', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const layoutContainer = screen.getByText('Content').closest('div');
      expect(layoutContainer).toHaveStyle({
        backgroundColor: '#ffffff',
        transition: expect.stringContaining('background-color'),
      });
    });

    it('handles theme mode changes smoothly', async () => {
      const { rerender } = renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // Change theme to dark mode
      (useTheme as jest.Mock).mockReturnValue({
        ...mockTheme,
        palette: { ...mockTheme.palette, mode: 'dark' },
      });

      rerender(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      await waitFor(() => {
        const layoutContainer = screen.getByText('Content').closest('div');
        expect(layoutContainer).toHaveStyle({
          colorScheme: 'dark',
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <MainLayout>
          <button>Focusable Button</button>
        </MainLayout>
      );

      const button = screen.getByText('Focusable Button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('provides proper ARIA labels and roles', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays child component errors', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
        return null;
      };

      renderWithProviders(
        <MainLayout>
          <ErrorComponent />
        </MainLayout>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('maintains basic functionality during errors', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
        return null;
      };

      renderWithProviders(
        <MainLayout>
          <ErrorComponent />
          <div>Valid Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', async () => {
      const startTime = performance.now();

      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // 100ms budget
    });

    it('handles large child components efficiently', async () => {
      const LargeComponent = () => (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i}>Item {i}</div>
          ))}
        </div>
      );

      const startTime = performance.now();

      renderWithProviders(
        <MainLayout>
          <LargeComponent />
        </MainLayout>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(1000); // 1s budget for large content
    });
  });
});