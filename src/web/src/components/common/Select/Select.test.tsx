/**
 * @file Comprehensive test suite for the reusable Select component
 * @version 1.0.0
 * @description Implements thorough testing of the Select component including
 * accessibility, user interactions, and error states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Select } from './Select';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock options for testing
const mockOptions = [
  { value: 'option1', label: 'Option 1', group: 'Group 1' },
  { value: 'option2', label: 'Option 2', group: 'Group 1' },
  { value: 'option3', label: 'Option 3', group: 'Group 2' }
];

// Mock handlers
const mockOnChange = jest.fn<(value: string | string[]) => void>();
const mockOnBlur = jest.fn<() => void>();
const mockOnSearch = jest.fn<(searchTerm: string) => void>();

// Test setup helper
const setup = (customProps = {}) => {
  const user = userEvent.setup();
  const defaultProps = {
    id: 'test-select',
    name: 'test-select',
    label: 'Test Select',
    value: '',
    options: mockOptions,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    testId: 'test-select'
  };

  const utils = renderWithProviders(
    <Select {...defaultProps} {...customProps} />
  );

  return {
    user,
    ...utils,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    onSearch: mockOnSearch
  };
};

describe('Select Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders with basic props and meets accessibility standards', async () => {
      const { container } = setup();
      
      // Verify basic rendering
      expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      
      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('properly associates label with input via aria-labelledby', () => {
      setup();
      const select = screen.getByRole('combobox');
      const label = screen.getByText('Test Select');
      expect(select).toHaveAttribute('aria-labelledby', expect.stringContaining('test-select-label'));
      expect(label).toHaveAttribute('id', expect.stringContaining('test-select-label'));
    });

    it('indicates required state correctly', () => {
      setup({ required: true });
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-required', 'true');
      expect(screen.getByText('Test Select')).toHaveAttribute('aria-required', 'true');
    });

    it('displays error state with appropriate ARIA attributes', () => {
      setup({ 
        error: true, 
        helperText: 'Error message' 
      });
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-describedby', expect.stringContaining('test-select-helper-text'));
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles single selection correctly', async () => {
      const { user } = setup();
      
      // Open dropdown
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      // Select an option
      const option = screen.getByText('Option 1');
      await user.click(option);
      
      // Verify selection
      expect(mockOnChange).toHaveBeenCalledWith('option1');
      expect(select).toHaveTextContent('Option 1');
    });

    it('handles multiple selection correctly', async () => {
      const { user } = setup({ 
        multiple: true,
        value: [] 
      });
      
      // Open dropdown
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      // Select multiple options
      await user.click(screen.getByText('Option 1'));
      await user.click(screen.getByText('Option 2'));
      
      // Verify selections
      expect(mockOnChange).toHaveBeenLastCalledWith(['option1', 'option2']);
    });

    it('supports keyboard navigation', async () => {
      const { user } = setup();
      const select = screen.getByRole('combobox');
      
      // Focus and open with keyboard
      await user.tab();
      expect(select).toHaveFocus();
      await user.keyboard('{Enter}');
      
      // Navigate options
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      // Verify selection
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles blur events correctly', async () => {
      const { user } = setup();
      
      // Focus and blur
      const select = screen.getByRole('combobox');
      await user.tab();
      await user.tab();
      
      expect(mockOnBlur).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('filters options based on search input', async () => {
      const { user } = setup({ searchable: true });
      
      // Open dropdown
      await user.click(screen.getByRole('combobox'));
      
      // Type search text
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'Option 1');
      
      // Verify filtered options
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Option 1');
    });

    it('handles empty search results gracefully', async () => {
      const { user } = setup({ searchable: true });
      
      // Open and search
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search...'), 'xyz');
      
      // Verify no options shown
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('sanitizes search input', async () => {
      const { user } = setup({ searchable: true });
      
      // Open and enter potentially unsafe input
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search...'), '<script>alert("xss")</script>');
      
      // Verify sanitized input
      const searchInput = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(searchInput.value).not.toContain('<script>');
    });
  });

  describe('Group Handling', () => {
    it('renders grouped options correctly', async () => {
      const { user } = setup();
      
      // Open dropdown
      await user.click(screen.getByRole('combobox'));
      
      // Verify group headers and structure
      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.getByText('Group 2')).toBeInTheDocument();
      
      const group1Options = within(screen.getByText('Group 1').parentElement!).getAllByRole('option');
      expect(group1Options).toHaveLength(2);
    });

    it('maintains group structure when filtering', async () => {
      const { user } = setup({ searchable: true });
      
      // Open and search
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search...'), 'Option 1');
      
      // Verify group structure maintained
      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.queryByText('Group 2')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty options array gracefully', () => {
      setup({ options: [] });
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('handles disabled state correctly', () => {
      setup({ disabled: true });
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
      expect(select).toHaveAttribute('aria-disabled', 'true');
    });

    it('handles individual disabled options', async () => {
      const { user } = setup({
        options: [
          ...mockOptions,
          { value: 'disabled', label: 'Disabled Option', disabled: true }
        ]
      });
      
      // Open dropdown
      await user.click(screen.getByRole('combobox'));
      
      // Verify disabled option
      const disabledOption = screen.getByText('Disabled Option');
      expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
    });
  });
});