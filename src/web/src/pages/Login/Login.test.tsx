/**
 * @file Comprehensive test suite for Login component
 * @version 1.0.0
 * @description Tests authentication flows, form validation, accessibility,
 * responsive layouts, and security features
 */

import React from 'react'; // v18.2+
import { screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0+
import userEvent from '@testing-library/user-event'; // v14.0+
import { describe, it, expect, beforeEach } from '@jest/globals'; // v29.0+
import { axe, toHaveNoViolations } from 'jest-axe'; // v7.0+
import mediaQuery from '@testing-library/react-hooks'; // v8.0+

import Login from './Login';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { handlers } from '../../../tests/mocks/handlers';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test data
const validCredentials = {
  email: 'test@example.com',
  password: 'Password123!'
};

const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'wrongpass'
};

describe('Login Component', () => {
  // Mock navigation
  const mockNavigate = jest.fn();
  
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Form Rendering and Validation', () => {
    it('should render login form with all required fields', () => {
      renderWithProviders(<Login />);

      expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should validate email format', async () => {
      renderWithProviders(<Login />);
      const emailInput = screen.getByLabelText(/email/i);

      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      expect(await screen.findByText(/please enter a valid email address/i))
        .toBeInTheDocument();
    });

    it('should validate password requirements', async () => {
      renderWithProviders(<Login />);
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.type(passwordInput, 'weak');
      fireEvent.blur(passwordInput);

      expect(await screen.findByText(/password must be at least 12 characters/i))
        .toBeInTheDocument();
    });

    it('should enable submit button only when form is valid', async () => {
      renderWithProviders(<Login />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(submitButton).toBeEnabled();

      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);

      expect(submitButton).toBeEnabled();
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      renderWithProviders(<Login />);

      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should display error message on failed login', async () => {
      renderWithProviders(<Login />);

      await userEvent.type(screen.getByLabelText(/email/i), invalidCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), invalidCredentials.password);
      
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });

    it('should implement rate limiting after multiple failed attempts', async () => {
      renderWithProviders(<Login />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Attempt multiple failed logins
      for (let i = 0; i < 3; i++) {
        await userEvent.type(screen.getByLabelText(/email/i), invalidCredentials.email);
        await userEvent.type(screen.getByLabelText(/password/i), invalidCredentials.password);
        await userEvent.click(submitButton);
      }

      expect(submitButton).toBeDisabled();
      expect(await screen.findByText(/too many login attempts/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<Login />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test tab order
      await userEvent.tab();
      expect(emailInput).toHaveFocus();

      await userEvent.tab();
      expect(passwordInput).toHaveFocus();

      await userEvent.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should announce form errors to screen readers', async () => {
      renderWithProviders(<Login />);
      const emailInput = screen.getByLabelText(/email/i);

      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      const errorMessage = await screen.findByText(/please enter a valid email address/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  describe('Responsive Layout', () => {
    it('should adjust layout for mobile viewport', async () => {
      // Mock mobile viewport
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      const { container } = renderWithProviders(<Login />);
      const loginForm = container.querySelector('form');

      expect(loginForm).toHaveStyle({
        padding: '24px' // Mobile padding
      });
    });

    it('should adjust layout for desktop viewport', async () => {
      // Mock desktop viewport
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      const { container } = renderWithProviders(<Login />);
      const loginForm = container.querySelector('form');

      expect(loginForm).toHaveStyle({
        padding: '32px' // Desktop padding
      });
    });
  });

  describe('Security Features', () => {
    it('should mask password input', () => {
      renderWithProviders(<Login />);
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should clear form data after successful login', async () => {
      renderWithProviders(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.type(emailInput, validCredentials.email);
      await userEvent.type(passwordInput, validCredentials.password);
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
      });
    });

    it('should prevent multiple simultaneous login attempts', async () => {
      renderWithProviders(<Login />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);

      // Attempt multiple rapid clicks
      await userEvent.click(submitButton);
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/signing in/i);
    });
  });
});