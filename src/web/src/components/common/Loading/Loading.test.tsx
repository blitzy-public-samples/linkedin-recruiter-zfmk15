import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import Loading from './Loading';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test constants
const TEST_IDS = {
  circular: 'loading-circular',
  linear: 'loading-linear',
  overlay: 'loading-overlay',
  message: 'loading-message'
};

const TEST_MESSAGES = {
  default: 'Loading...',
  custom: 'Custom loading message'
};

const TEST_SIZES = ['small', 'medium', 'large'] as const;
const TEST_VARIANTS = ['circular', 'linear', 'overlay'] as const;

describe('Loading Component', () => {
  // Test basic rendering
  it('renders circular variant by default', () => {
    const { container } = renderWithProviders(<Loading />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // Test all variants
  it('renders all variants correctly', () => {
    TEST_VARIANTS.forEach(variant => {
      const { container } = renderWithProviders(<Loading variant={variant} />);

      if (variant === 'circular') {
        expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
      } else if (variant === 'linear') {
        expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
      } else if (variant === 'overlay') {
        expect(container.querySelector('.MuiPaper-root')).toBeInTheDocument();
        expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
      }
    });
  });

  // Test size customization
  it('handles size prop correctly for all variants', () => {
    TEST_SIZES.forEach(size => {
      TEST_VARIANTS.forEach(variant => {
        const { container } = renderWithProviders(
          <Loading variant={variant} size={size} />
        );

        const sizeMap = {
          small: variant === 'circular' ? 24 : 200,
          medium: variant === 'circular' ? 40 : 300,
          large: variant === 'circular' ? 56 : 400
        };

        const expectedSize = sizeMap[size];

        if (variant === 'circular') {
          const progress = container.querySelector('.MuiCircularProgress-root');
          expect(progress).toHaveStyle({ width: `${expectedSize}px`, height: `${expectedSize}px` });
        } else if (variant === 'linear') {
          const progress = container.querySelector('.MuiLinearProgress-root');
          expect(progress).toHaveStyle({ width: `${expectedSize}px` });
        }
      });
    });
  });

  // Test message rendering
  it('displays loading message correctly', () => {
    const { getByText } = renderWithProviders(
      <Loading message={TEST_MESSAGES.custom} />
    );
    expect(getByText(TEST_MESSAGES.custom)).toBeInTheDocument();
  });

  // Test fullscreen overlay
  it('renders fullscreen overlay correctly', () => {
    const { container } = renderWithProviders(
      <Loading variant="overlay" fullscreen />
    );
    const overlay = container.querySelector('.MuiPaper-root');
    expect(overlay).toHaveStyle({
      position: 'fixed',
      width: '100vw',
      height: '100vh'
    });
  });

  // Test backdrop functionality
  it('handles backdrop in overlay variant', () => {
    const { container } = renderWithProviders(
      <Loading variant="overlay" disableBackdrop={false} />
    );
    const backdrop = container.querySelector('.MuiBox-root');
    expect(backdrop).toHaveStyle({
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    });
  });

  // Test color prop
  it('applies color prop correctly', () => {
    const colors = ['primary', 'secondary', 'error', 'info', 'success', 'warning'] as const;
    colors.forEach(color => {
      const { container } = renderWithProviders(<Loading color={color} />);
      const progress = container.querySelector('.MuiCircularProgress-root');
      expect(progress).toHaveClass(`MuiCircularProgress-${color}`);
    });
  });

  // Test accessibility
  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(<Loading message={TEST_MESSAGES.custom} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct ARIA attributes', () => {
    const { container } = renderWithProviders(
      <Loading message={TEST_MESSAGES.custom} role="status" />
    );
    const progress = container.querySelector('[role="status"]');
    expect(progress).toHaveAttribute('aria-label', TEST_MESSAGES.custom);
  });

  // Test responsive behavior
  it('maintains responsive layout', async () => {
    const { container } = renderWithProviders(
      <Loading variant="overlay" fullscreen />
    );
    
    // Test initial layout
    const overlay = container.querySelector('.MuiPaper-root');
    expect(overlay).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    });

    // Test responsive transitions
    await waitFor(() => {
      expect(overlay).toHaveStyle({
        transition: expect.stringContaining('opacity')
      });
    });
  });

  // Test error states
  it('handles invalid props gracefully', () => {
    // @ts-expect-error - Testing invalid variant
    const { container } = renderWithProviders(<Loading variant="invalid" />);
    // Should fallback to circular variant
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  // Test component cleanup
  it('cleans up properly on unmount', () => {
    const { unmount, container } = renderWithProviders(
      <Loading variant="overlay" fullscreen />
    );
    unmount();
    expect(container.innerHTML).toBe('');
  });
});