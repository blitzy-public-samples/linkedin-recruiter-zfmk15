import React from 'react'; // v18.0+
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0+
import userEvent from '@testing-library/user-event'; // v14.0+
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest'; // v0.34+
import { axe } from 'jest-axe'; // v7.0+
import ResizeObserver from 'resize-observer-polyfill'; // v1.5+
import { setupServer } from 'msw'; // v1.3+

import { SearchResults } from './SearchResults';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { useSearch } from '../../../hooks/useSearch';

// Mock dependencies
vi.mock('../../../hooks/useSearch');

// Constants for testing
const MOCK_SEARCH_RESULTS = {
  profiles: [
    {
      id: 'profile-1',
      fullName: 'John Smith',
      headline: 'Senior Developer',
      location: 'San Francisco, CA',
      matchScore: 92,
      skills: ['React', 'TypeScript', 'Node.js'],
      experience: ['Tech Lead at Example Corp'],
      education: ['BS Computer Science']
    },
    {
      id: 'profile-2',
      fullName: 'Sarah Jones',
      headline: 'Frontend Engineer',
      location: 'New York, NY',
      matchScore: 88,
      skills: ['React', 'JavaScript', 'CSS'],
      experience: ['Senior Developer at Tech Co'],
      education: ['MS Software Engineering']
    }
  ],
  totalCount: 24,
  page: 0,
  pageSize: 20
};

const VIEWPORT_SIZES = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

const TEST_IDS = {
  resultGrid: 'search-results-grid',
  sortControls: 'sort-controls',
  pagination: 'pagination-controls',
  profileCard: 'profile-card',
  loadingState: 'loading-state',
  errorState: 'error-state',
  emptyState: 'empty-state'
};

// Setup MSW server for API mocking
const server = setupServer();

describe('SearchResults Component', () => {
  // Mock search hook implementation
  const mockHandleSortChange = vi.fn();
  const mockHandlePageChange = vi.fn();
  const mockHandleProfileAction = vi.fn();

  beforeAll(() => {
    // Setup MSW server
    server.listen();
    
    // Mock ResizeObserver
    global.ResizeObserver = ResizeObserver;
    
    // Mock search hook
    vi.mocked(useSearch).mockReturnValue({
      handleSortChange: mockHandleSortChange,
      handlePageChange: mockHandlePageChange,
      handleProfileAction: mockHandleProfileAction
    });
  });

  beforeEach(() => {
    // Reset mocks and handlers
    vi.clearAllMocks();
    server.resetHandlers();
  });

  describe('Rendering States', () => {
    test('should render loading state correctly', () => {
      const { getByTestId } = renderWithProviders(
        <SearchResults 
          results={null}
          isLoading={true}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      expect(getByTestId(TEST_IDS.loadingState)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading search results');
    });

    test('should render error state correctly', () => {
      const error = new Error('Failed to fetch results');
      const { getByTestId } = renderWithProviders(
        <SearchResults 
          results={null}
          isLoading={false}
          error={error}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      expect(getByTestId(TEST_IDS.errorState)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(error.message);
    });

    test('should render empty state correctly', () => {
      const { getByTestId } = renderWithProviders(
        <SearchResults 
          results={{ ...MOCK_SEARCH_RESULTS, profiles: [], totalCount: 0 }}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      expect(getByTestId(TEST_IDS.emptyState)).toBeInTheDocument();
      expect(screen.getByText('No profiles found')).toBeInTheDocument();
    });

    test('should render results grid correctly', () => {
      const { getByTestId } = renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      expect(getByTestId(TEST_IDS.resultGrid)).toBeInTheDocument();
      expect(screen.getAllByTestId(TEST_IDS.profileCard)).toHaveLength(MOCK_SEARCH_RESULTS.profiles.length);
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation', async () => {
      const onProfileView = vi.fn();
      renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={onProfileView}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      const firstCard = screen.getAllByTestId(TEST_IDS.profileCard)[0];
      firstCard.focus();
      fireEvent.keyDown(firstCard, { key: 'Enter' });
      
      expect(onProfileView).toHaveBeenCalledWith(MOCK_SEARCH_RESULTS.profiles[0].id);
    });

    test('should announce results count to screen readers', () => {
      renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      const resultsRegion = screen.getByRole('region', { name: 'Search Results' });
      expect(resultsRegion).toHaveTextContent(`${MOCK_SEARCH_RESULTS.totalCount} profiles found`);
    });
  });

  describe('Responsive Behavior', () => {
    test.each(Object.entries(VIEWPORT_SIZES))(
      'should render correctly at %s viewport',
      async (size, dimensions) => {
        global.innerWidth = dimensions.width;
        global.innerHeight = dimensions.height;
        global.dispatchEvent(new Event('resize'));

        const { container } = renderWithProviders(
          <SearchResults 
            results={MOCK_SEARCH_RESULTS}
            isLoading={false}
            error={null}
            onProfileView={() => {}}
            onProfileSave={() => {}}
            onProfileRemove={() => {}}
          />
        );

        // Wait for responsive adjustments
        await waitFor(() => {
          const grid = container.querySelector('.MuiGrid-container');
          expect(grid).toHaveStyle({
            padding: dimensions.width < 600 ? '8px' : '16px'
          });
        });
      }
    );
  });

  describe('Interactions', () => {
    test('should handle sort changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      const sortSelect = screen.getByLabelText('Sort results by');
      await user.click(sortSelect);
      await user.click(screen.getByText('Experience'));

      expect(mockHandleSortChange).toHaveBeenCalledWith('EXPERIENCE', 'DESC');
    });

    test('should handle pagination', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      const nextPageButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextPageButton);

      expect(mockHandlePageChange).toHaveBeenCalledWith(1);
    });

    test('should handle profile card actions', async () => {
      const onProfileView = vi.fn();
      const onProfileSave = vi.fn();
      const onProfileRemove = vi.fn();

      const user = userEvent.setup();
      renderWithProviders(
        <SearchResults 
          results={MOCK_SEARCH_RESULTS}
          isLoading={false}
          error={null}
          onProfileView={onProfileView}
          onProfileSave={onProfileSave}
          onProfileRemove={onProfileRemove}
        />
      );

      const firstCard = screen.getAllByTestId(TEST_IDS.profileCard)[0];
      const viewButton = within(firstCard).getByLabelText('View profile details');
      await user.click(viewButton);

      expect(onProfileView).toHaveBeenCalledWith(MOCK_SEARCH_RESULTS.profiles[0].id);
    });
  });

  describe('Performance', () => {
    test('should virtualize large result sets', async () => {
      const largeResults = {
        ...MOCK_SEARCH_RESULTS,
        profiles: Array(100).fill(MOCK_SEARCH_RESULTS.profiles[0]),
        totalCount: 100
      };

      const { container } = renderWithProviders(
        <SearchResults 
          results={largeResults}
          isLoading={false}
          error={null}
          onProfileView={() => {}}
          onProfileSave={() => {}}
          onProfileRemove={() => {}}
        />
      );

      // Check that only a subset of profiles are rendered
      const renderedCards = container.querySelectorAll(`[data-testid="${TEST_IDS.profileCard}"]`);
      expect(renderedCards.length).toBeLessThan(largeResults.profiles.length);
    });
  });
});