/**
 * @file SearchFilters Component Test Suite
 * @version 1.0.0
 * @description Comprehensive test suite for SearchFilters component validating functionality,
 * accessibility, and user interactions
 */

import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi, describe, beforeEach, test, expect } from 'vitest'; // v0.34.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0

import SearchFilters from './SearchFilters';
import { SearchCriteria } from '../../../types/search.types';
import { useSearch } from '../../../hooks/useSearch';

// Mock dependencies
vi.mock('../../../hooks/useSearch');

// Mock search hook implementation
const mockHandleSearch = vi.fn();
const mockUseSearch = useSearch as jest.Mock;

// Test data
const initialCriteria: SearchCriteria = {
  keywords: '',
  location: null,
  experienceYears: { min: 0, max: 15 },
  requiredSkills: [],
  optionalSkills: []
};

describe('SearchFilters Component', () => {
  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({
      handleSearch: mockHandleSearch,
      searchCriteria: initialCriteria,
      isLoading: false,
      error: null
    });
  });

  describe('Rendering and Accessibility', () => {
    test('renders all filter sections correctly', () => {
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Verify all sections are present
      expect(screen.getByRole('complementary', { name: /search filters/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /location/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /experience/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /required skills/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /optional skills/i })).toBeInTheDocument();
    });

    test('meets accessibility requirements', async () => {
      const { container } = render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Run accessibility checks
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Verify ARIA attributes
      const filterPanel = screen.getByRole('complementary');
      expect(filterPanel).toHaveAttribute('aria-label', 'Search Filters');

      // Test keyboard navigation
      const locationInput = screen.getByRole('textbox', { name: /location/i });
      locationInput.focus();
      expect(document.activeElement).toBe(locationInput);
    });

    test('handles collapsed state correctly', () => {
      const onToggleCollapse = vi.fn();
      
      render(
        <SearchFilters 
          isCollapsed={true}
          onToggleCollapse={onToggleCollapse}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Verify collapse button functionality
      const expandButton = screen.getByRole('button', { name: /expand filters/i });
      fireEvent.click(expandButton);
      expect(onToggleCollapse).toHaveBeenCalled();
    });
  });

  describe('Location Filter', () => {
    test('updates location with debounced search', async () => {
      const user = userEvent.setup();
      
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Type location
      const locationInput = screen.getByRole('textbox', { name: /location/i });
      await user.type(locationInput, 'San Francisco');

      // Verify debounced search
      await waitFor(() => {
        expect(mockHandleSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            location: 'San Francisco'
          })
        );
      }, { timeout: 500 });
    });

    test('validates location input', async () => {
      const user = userEvent.setup();
      
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Test invalid input
      const locationInput = screen.getByRole('textbox', { name: /location/i });
      await user.type(locationInput, '<script>alert("xss")</script>');

      // Verify sanitized input
      expect(locationInput).not.toHaveValue('<script>alert("xss")</script>');
    });
  });

  describe('Experience Range Filter', () => {
    test('updates experience range correctly', async () => {
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Find and interact with slider
      const slider = screen.getByRole('slider', { name: /experience range/i });
      fireEvent.change(slider, { target: { value: [2, 8] } });

      // Verify search update
      await waitFor(() => {
        expect(mockHandleSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            experienceYears: { min: 2, max: 8 }
          })
        );
      });
    });

    test('validates experience range constraints', async () => {
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Attempt invalid range
      const slider = screen.getByRole('slider', { name: /experience range/i });
      fireEvent.change(slider, { target: { value: [10, 5] } });

      // Verify error message
      expect(screen.getByText(/minimum experience cannot exceed maximum/i)).toBeInTheDocument();
    });
  });

  describe('Skills Management', () => {
    test('adds and removes required skills', async () => {
      const user = userEvent.setup();
      
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Add required skill
      const requiredSkillInput = screen.getByRole('combobox', { name: /add required skill/i });
      await user.type(requiredSkillInput, 'React{enter}');

      // Verify skill added
      expect(screen.getByText('React')).toBeInTheDocument();

      // Remove skill
      const removeButton = screen.getByRole('button', { name: /remove react/i });
      await user.click(removeButton);

      // Verify skill removed
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });

    test('prevents duplicate skills', async () => {
      const user = userEvent.setup();
      
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={() => {}}
        />
      );

      // Add skill twice
      const skillInput = screen.getByRole('combobox', { name: /add required skill/i });
      await user.type(skillInput, 'React{enter}');
      await user.type(skillInput, 'React{enter}');

      // Verify error message
      expect(screen.getByText(/skill already added/i)).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    test('disables inputs when loading', () => {
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={true}
          onClearFilters={() => {}}
        />
      );

      // Verify all inputs are disabled
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    test('displays error messages', () => {
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          error="Failed to update filters"
          onClearFilters={() => {}}
        />
      );

      // Verify error message displayed
      expect(screen.getByText(/failed to update filters/i)).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    test('clears all filters when reset', async () => {
      const onClearFilters = vi.fn();
      const user = userEvent.setup();
      
      render(
        <SearchFilters 
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isLoading={false}
          onClearFilters={onClearFilters}
        />
      );

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);

      // Verify clear handler called
      expect(onClearFilters).toHaveBeenCalled();
    });
  });
});