import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, jest } from '@jest/globals';
import Button from './Button';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test IDs for consistent querying
const TEST_IDS = {
  button: 'button-component',
  spinner: 'button-spinner',
  icon: 'button-icon'
};

// Common button variants for testing
const BUTTON_VARIANTS = ['contained', 'outlined', 'text'] as const;
const BUTTON_SIZES = ['small', 'medium', 'large'] as const;

// Helper function to render button with providers
const renderButton = (props = {}) => {
  const defaultProps = {
    children: 'Test Button',
    'data-testid': TEST_IDS.button,
    onClick: jest.fn()
  };
  return renderWithProviders(<Button {...defaultProps} {...props} />);
};

describe('Button Component', () => {
  // Material Design 3.0 Compliance Tests
  describe('Material Design 3.0 Compliance', () => {
    it('renders with correct base styles', () => {
      renderButton();
      const button = screen.getByTestId(TEST_IDS.button);
      
      // Verify minimum touch target size
      expect(button).toHaveStyle({ minHeight: '44px' });
      
      // Verify transition properties
      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.transition).toContain('background-color');
      expect(computedStyle.transition).toContain('box-shadow');
    });

    it.each(BUTTON_VARIANTS)('renders correct styles for %s variant', (variant) => {
      renderButton({ variant });
      const button = screen.getByTestId(TEST_IDS.button);
      
      expect(button).toHaveClass(`MuiButton-${variant}`);
      
      if (variant === 'contained') {
        expect(button).toHaveStyle({ boxShadow: expect.any(String) });
      }
    });

    it.each(BUTTON_SIZES)('renders correct size for %s button', (size) => {
      renderButton({ size });
      const button = screen.getByTestId(TEST_IDS.button);
      expect(button).toHaveClass(`MuiButton-size${size.charAt(0).toUpperCase() + size.slice(1)}`);
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = renderButton();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('handles keyboard navigation correctly', async () => {
      const handleClick = jest.fn();
      renderButton({ onClick: handleClick });
      
      const button = screen.getByTestId(TEST_IDS.button);
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('provides correct ARIA attributes', () => {
      const ariaLabel = 'Test Button Label';
      renderButton({ 
        ariaLabel,
        loading: true,
        loadingText: 'Loading...' 
      });
      
      const button = screen.getByTestId(TEST_IDS.button);
      expect(button).toHaveAttribute('aria-label', 'Loading...');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-live', 'polite');
    });

    it('maintains focus visibility', () => {
      renderButton();
      const button = screen.getByTestId(TEST_IDS.button);
      
      button.focus();
      expect(button).toHaveClass('MuiButton-focusVisible');
    });
  });

  // Interactive State Tests
  describe('Interactive States', () => {
    it('handles click events correctly', async () => {
      const handleClick = jest.fn();
      renderButton({ onClick: handleClick });
      
      const button = screen.getByTestId(TEST_IDS.button);
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents interaction when disabled', async () => {
      const handleClick = jest.fn();
      renderButton({ onClick: handleClick, disabled: true });
      
      const button = screen.getByTestId(TEST_IDS.button);
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toHaveClass('Mui-disabled');
    });

    it('displays loading state correctly', () => {
      renderButton({ loading: true, loadingText: 'Loading...' });
      
      const button = screen.getByTestId(TEST_IDS.button);
      const spinner = screen.getByRole('progressbar');
      
      expect(button).toHaveClass('loading');
      expect(spinner).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('handles icons correctly', () => {
      const startIcon = <span data-testid="start-icon">Start</span>;
      const endIcon = <span data-testid="end-icon">End</span>;
      
      renderButton({ startIcon, endIcon });
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });
  });

  // Edge Cases and Error Handling
  describe('Edge Cases', () => {
    it('handles rapid click events', async () => {
      const handleClick = jest.fn();
      renderButton({ onClick: handleClick });
      
      const button = screen.getByTestId(TEST_IDS.button);
      await userEvent.tripleClick(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('handles long button text gracefully', () => {
      const longText = 'This is a very long button text that should be handled gracefully';
      renderButton({ children: longText });
      
      const button = screen.getByTestId(TEST_IDS.button);
      expect(button).toHaveTextContent(longText);
      expect(window.getComputedStyle(button).textOverflow).toBe('ellipsis');
    });

    it('maintains accessibility during state transitions', async () => {
      const { rerender } = renderButton({ loading: false });
      
      const button = screen.getByTestId(TEST_IDS.button);
      expect(button).toHaveAttribute('aria-busy', 'false');
      
      rerender(<Button loading={true} loadingText="Loading...">Test Button</Button>);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});