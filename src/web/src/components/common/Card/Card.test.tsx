import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTheme, ThemeProvider } from '@mui/material';
import { Card } from '../Card';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme for consistent testing
const mockTheme = createTheme({
  shape: {
    borderRadius: 8,
  },
  spacing: (factor: number) => `${factor * 8}px`,
  transitions: {
    create: () => 'all 0.3s ease',
    duration: {
      shorter: 200,
    },
  },
  palette: {
    primary: {
      main: '#1976d2',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
    },
    background: {
      paper: '#ffffff',
    },
    divider: '#e0e0e0',
  },
});

describe('Card Component', () => {
  // Mock handlers
  const mockClickHandler = vi.fn();

  // Setup and cleanup
  beforeEach(() => {
    mockClickHandler.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders children content correctly', () => {
      renderWithProviders(
        <Card>
          <div data-testid="child-content">Test Content</div>
        </Card>
      );

      expect(screen.getByTestId('child-content')).toHaveTextContent('Test Content');
    });

    it('renders media content when provided', () => {
      const mediaProps = {
        src: 'test-image.jpg',
        alt: 'Test Image',
        height: 200,
      };

      renderWithProviders(
        <Card
          media={mediaProps}
        >
          Content
        </Card>
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mediaProps.src);
      expect(image).toHaveAttribute('alt', mediaProps.alt);
      expect(image).toHaveAttribute('height', mediaProps.height.toString());
    });

    it('renders action buttons when provided', () => {
      renderWithProviders(
        <Card
          actions={
            <button>Action Button</button>
          }
        >
          Content
        </Card>
      );

      expect(screen.getByRole('button')).toHaveTextContent('Action Button');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderWithProviders(
        <Card
          ariaLabel="Test Card"
          role="article"
        >
          Accessible Content
        </Card>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation when clickable', async () => {
      renderWithProviders(
        <Card
          onClick={mockClickHandler}
          ariaLabel="Clickable Card"
        >
          Keyboard Accessible Content
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');

      // Test Enter key
      await userEvent.type(card, '{Enter}');
      expect(mockClickHandler).toHaveBeenCalledTimes(1);

      // Test Space key
      await userEvent.type(card, ' ');
      expect(mockClickHandler).toHaveBeenCalledTimes(2);
    });

    it('has correct ARIA attributes', () => {
      const ariaLabel = 'Test Card Label';
      renderWithProviders(
        <Card
          ariaLabel={ariaLabel}
          role="article"
        >
          Content
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', ariaLabel);
    });
  });

  describe('Visual Styling', () => {
    it('applies elevated variant styles correctly', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card variant="elevated">
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        backgroundColor: mockTheme.palette.background.paper,
        boxShadow: mockTheme.shadows[1],
      });
    });

    it('applies outlined variant styles correctly', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card variant="outlined">
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        backgroundColor: mockTheme.palette.background.paper,
        border: `1px solid ${mockTheme.palette.divider}`,
      });
    });

    it('applies filled variant styles correctly', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card variant="filled">
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        backgroundColor: mockTheme.palette.grey[50],
      });
    });

    it('applies custom elevation when specified', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card variant="elevated" elevation={4}>
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        boxShadow: mockTheme.shadows[4],
      });
    });
  });

  describe('Interaction Behavior', () => {
    it('handles click events correctly', async () => {
      renderWithProviders(
        <Card onClick={mockClickHandler}>
          Clickable Content
        </Card>
      );

      const card = screen.getByRole('article');
      await userEvent.click(card);
      expect(mockClickHandler).toHaveBeenCalledTimes(1);
    });

    it('shows correct cursor style when clickable', () => {
      renderWithProviders(
        <Card onClick={mockClickHandler}>
          Clickable Content
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({ cursor: 'pointer' });
    });

    it('handles media loading errors gracefully', () => {
      const mediaProps = {
        src: 'invalid-image.jpg',
        alt: 'Test Image',
      };

      renderWithProviders(
        <Card media={mediaProps}>
          Content
        </Card>
      );

      const image = screen.getByRole('img');
      fireEvent.error(image);
      
      expect(image).toHaveAttribute('src', 'path/to/fallback-image.jpg');
    });
  });

  describe('Theme Integration', () => {
    it('respects theme spacing values', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card>
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        padding: mockTheme.spacing(2),
      });
    });

    it('applies theme border radius', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card>
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        borderRadius: mockTheme.shape.borderRadius,
      });
    });

    it('uses theme transitions', () => {
      renderWithProviders(
        <ThemeProvider theme={mockTheme}>
          <Card>
            Content
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        transition: mockTheme.transitions.create(['box-shadow', 'transform', 'border-color']),
      });
    });
  });
});