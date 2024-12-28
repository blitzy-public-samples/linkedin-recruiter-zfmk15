import React from 'react';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Error from './Error';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// @testing-library/react version 14.0+
// vitest version 0.34+
// react version 18.0+

describe('Error component', () => {
  // Mock console.error to suppress expected error logs during tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  // Helper function to render Error component with providers
  const renderError = (props: Partial<ErrorProps> = {}) => {
    return renderWithProviders(
      <Error 
        error={props.error || new Error('Test error')}
        severity={props.severity}
        onRetry={props.onRetry}
        className={props.className}
        role={props.role}
      />
    );
  };

  describe('Basic rendering', () => {
    it('renders error message correctly', () => {
      renderError({ error: 'Simple error message' });
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Simple error message');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('handles string error input', () => {
      const message = 'String error message';
      renderError({ error: message });
      
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('handles Error object input', () => {
      const errorMessage = 'Error object message';
      renderError({ error: new Error(errorMessage) });
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('handles API error input', () => {
      const apiError = {
        status: 404,
        message: 'Resource not found',
        code: 'NOT_FOUND',
        details: { context: 'Additional context' }
      };
      renderError({ error: apiError });
      
      expect(screen.getByText(/Resource not found/)).toBeInTheDocument();
      expect(screen.getByText(/Additional context/)).toBeInTheDocument();
    });
  });

  describe('Retry functionality', () => {
    it('displays retry button when callback provided', () => {
      const onRetry = vi.fn();
      renderError({ onRetry });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('handles retry action with loading state', async () => {
      const onRetry = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderError({ onRetry });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      // Verify loading state
      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
      
      // Wait for retry to complete
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/retrying/i)).not.toBeInTheDocument();
      });
    });

    it('prevents multiple retry clicks while loading', async () => {
      const onRetry = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderError({ onRetry });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Severity styles', () => {
    it('applies error severity by default', () => {
      renderError();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-standardError');
    });

    it('applies warning severity correctly', () => {
      renderError({ severity: 'warning' });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-standardWarning');
    });

    it('applies info severity correctly', () => {
      renderError({ severity: 'info' });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-standardInfo');
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility requirements', () => {
      const { checkAccessibility } = renderError();
      return checkAccessibility();
    });

    it('uses correct ARIA role', () => {
      renderError({ role: 'status' });
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('provides accessible retry button', () => {
      const onRetry = vi.fn();
      renderError({ onRetry });
      
      const retryButton = screen.getByRole('button', { name: /retry action/i });
      expect(retryButton).toHaveAttribute('aria-label', 'Retry action');
    });

    it('announces loading state to screen readers', async () => {
      const onRetry = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderError({ onRetry });
      
      const retryButton = screen.getByRole('button');
      fireEvent.click(retryButton);
      
      expect(retryButton).toHaveAttribute('aria-label', 'Retrying...');
      await waitFor(() => {
        expect(retryButton).toHaveAttribute('aria-label', 'Retry action');
      });
    });
  });

  describe('Error formatting', () => {
    it('formats error message with context when available', () => {
      const apiError = {
        status: 500,
        message: 'Server error',
        code: 'INTERNAL_ERROR',
        details: { context: 'Database connection failed' }
      };
      renderError({ error: apiError });
      
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();
    });

    it('handles errors without additional context', () => {
      const apiError = {
        status: 400,
        message: 'Bad request',
        code: 'VALIDATION_ERROR'
      };
      renderError({ error: apiError });
      
      expect(screen.getByText('Bad request')).toBeInTheDocument();
    });
  });
});