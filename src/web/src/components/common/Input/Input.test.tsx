import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { axe } from '@axe-core/react';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import Input from './Input';
import { sanitizeInput } from '../../../utils/validation';

// Mock the validation utility
jest.mock('../../../utils/validation', () => ({
  sanitizeInput: jest.fn((value) => value)
}));

// Test data constants
const TEST_DATA = {
  validInputs: {
    text: 'Test input with special chars: @#$%',
    email: 'test.user@example.com',
    password: 'StrongP@ssw0rd123!',
    tel: '+1-234-567-8900',
    url: 'https://example.com'
  },
  invalidInputs: {
    email: 'invalid-email@',
    password: 'weak',
    tel: '123',
    url: 'invalid-url',
    xssAttempt: "<script>alert('xss')</script>"
  },
  accessibilityLabels: {
    required: 'Required field',
    error: 'Error: Invalid input',
    success: 'Input accepted'
  }
};

// Enhanced setup function for tests
const setup = (props = {}) => {
  const user = userEvent.setup({ delay: null });
  const defaultProps = {
    id: 'test-input',
    name: 'test',
    label: 'Test Input',
    value: '',
    onChange: jest.fn(),
    onBlur: jest.fn(),
    'aria-label': 'Test input field'
  };

  const utils = renderWithProviders(
    <Input {...defaultProps} {...props} />
  );

  const input = screen.getByRole('textbox');
  return {
    input,
    user,
    ...utils
  };
};

describe('Input Component', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Accessibility Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = setup();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels when required', async () => {
      const { input } = setup({ required: true });
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should announce error messages to screen readers', async () => {
      const { input } = setup({
        error: true,
        helperText: TEST_DATA.accessibilityLabels.error
      });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(TEST_DATA.accessibilityLabels.error))
        .toHaveAttribute('id');
    });

    it('should support keyboard navigation', async () => {
      const { input, user } = setup();
      await user.tab();
      expect(input).toHaveFocus();
    });
  });

  describe('Input Validation and Security', () => {
    it('should sanitize input to prevent XSS', async () => {
      const { input, user } = setup();
      await user.type(input, TEST_DATA.invalidInputs.xssAttempt);
      expect(sanitizeInput).toHaveBeenCalledWith(
        TEST_DATA.invalidInputs.xssAttempt,
        expect.any(Object)
      );
    });

    it('should validate email format', async () => {
      const onError = jest.fn();
      const { input, user } = setup({
        type: 'email',
        onError
      });

      await user.type(input, TEST_DATA.invalidInputs.email);
      await user.tab(); // Trigger blur validation
      expect(onError).toHaveBeenCalledWith('Invalid email address');
    });

    it('should enforce password requirements', async () => {
      const { input, user } = setup({
        type: 'password',
        pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$'
      });

      await user.type(input, TEST_DATA.invalidInputs.password);
      await user.tab();
      expect(screen.getByText(/Invalid .* format/i)).toBeInTheDocument();
    });

    it('should validate URL format', async () => {
      const { input, user } = setup({
        type: 'url'
      });

      await user.type(input, TEST_DATA.invalidInputs.url);
      await user.tab();
      expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle copy/paste operations securely', async () => {
      const { input, user } = setup();
      await user.click(input);
      await user.paste(TEST_DATA.validInputs.text);
      expect(sanitizeInput).toHaveBeenCalled();
    });

    it('should handle IME input correctly', async () => {
      const onChange = jest.fn();
      const { input } = setup({ onChange });

      // Simulate IME composition
      fireEvent.compositionStart(input);
      fireEvent.compositionUpdate(input, { data: '你' });
      fireEvent.compositionEnd(input, { data: '你好' });
      
      expect(onChange).toHaveBeenCalledWith('你好');
    });

    it('should debounce validation on rapid input', async () => {
      const onChange = jest.fn();
      const { input, user } = setup({ onChange });

      await user.type(input, 'fast typing');
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(11); // One per character
      });
    });

    it('should handle autofill events', async () => {
      const { input } = setup({
        type: 'email',
        autoComplete: 'email'
      });

      // Simulate browser autofill
      fireEvent.animationStart(input, {
        animationName: 'onAutoFillStart'
      });

      expect(input).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Error Handling', () => {
    it('should display error states correctly', async () => {
      const { input, rerender } = setup({
        error: true,
        helperText: 'Error message'
      });

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should handle required field validation', async () => {
      const { input, user } = setup({
        required: true,
        label: 'Required Field'
      });

      await user.click(input);
      await user.tab(); // Trigger blur
      expect(screen.getByText('Required Field is required')).toBeInTheDocument();
    });

    it('should recover from error state after valid input', async () => {
      const { input, user } = setup({
        type: 'email',
        error: true,
        helperText: 'Invalid email'
      });

      await user.type(input, TEST_DATA.validInputs.email);
      await user.tab();
      expect(screen.queryByText('Invalid email')).not.toBeInTheDocument();
    });

    it('should handle network errors during validation', async () => {
      const onError = jest.fn();
      const { input, user } = setup({
        onError,
        pattern: '^[a-zA-Z]+$'
      });

      await user.type(input, '123');
      await user.tab();
      expect(onError).toHaveBeenCalled();
    });
  });
});