/**
 * @file Search Page Component
 * @version 1.0.0
 * @description Main search page implementing comprehensive LinkedIn profile search
 * with real-time updates, accessibility, and error handling
 * 
 * Dependencies:
 * - react: ^18.0.0
 * - @mui/material: ^5.14.0
 * - react-router-dom: ^6.0.0
 * - react-error-boundary: ^4.0.0
 */

import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Alert, Skeleton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ErrorBoundary } from 'react-error-boundary';
import { debounce } from 'lodash';

// Internal imports
import SearchForm from '../../components/search/SearchForm/SearchForm';
import SearchResults from '../../components/search/SearchResults/SearchResults';
import { useSearch } from '../../hooks/useSearch';
import { SearchCriteria } from '../../types/search.types';

// Styled components with accessibility enhancements
const SearchContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },
}));

const ResultsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  minHeight: 400,
  position: 'relative',
}));

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <Alert 
    severity="error" 
    action={
      <button onClick={resetErrorBoundary}>Retry</button>
    }
  >
    {error.message}
  </Alert>
);

/**
 * Enhanced Search page component implementing comprehensive search functionality
 * with real-time updates, accessibility, and error handling
 */
export const Search: React.FC = () => {
  const navigate = useNavigate();
  const {
    searchCriteria,
    searchResults,
    searchStatus,
    wsStatus,
    error,
    handleSearch,
    handleSortChange,
    handlePageChange,
    retrySearch
  } = useSearch();

  // Debounced search handler to prevent excessive API calls
  const debouncedSearch = useCallback(
    debounce((criteria: SearchCriteria) => {
      handleSearch(criteria);
    }, 300),
    [handleSearch]
  );

  // Initialize WebSocket connection and cleanup
  useEffect(() => {
    if (wsStatus === 'DISCONNECTED') {
      retrySearch();
    }

    return () => {
      // Cleanup WebSocket connection on unmount
    };
  }, [wsStatus, retrySearch]);

  // Profile action handlers
  const handleProfileView = useCallback((profileId: string) => {
    navigate(`/profiles/${profileId}`);
  }, [navigate]);

  const handleProfileSave = useCallback(async (profileId: string) => {
    try {
      // Implement save to favorites logic
      console.log('Saving profile:', profileId);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  }, []);

  const handleProfileRemove = useCallback(async (profileId: string) => {
    try {
      // Implement remove from results logic
      console.log('Removing profile:', profileId);
    } catch (error) {
      console.error('Failed to remove profile:', error);
    }
  }, []);

  // Search form submission handler
  const handleSearchSubmit = useCallback(async (criteria: SearchCriteria) => {
    try {
      debouncedSearch(criteria);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [debouncedSearch]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={retrySearch}
    >
      <SearchContainer role="main" aria-label="LinkedIn Profile Search">
        <Grid container spacing={3}>
          {/* Search Form Section */}
          <Grid item xs={12} md={4}>
            <SearchForm
              onSubmit={handleSearchSubmit}
              initialValues={searchCriteria}
              isLoading={searchStatus === 'SEARCHING'}
              onLiveUpdate={debouncedSearch}
              websocketStatus={wsStatus}
            />
          </Grid>

          {/* Search Results Section */}
          <Grid item xs={12} md={8}>
            <ResultsContainer>
              {error ? (
                <Alert 
                  severity="error"
                  action={
                    <button onClick={retrySearch}>Retry Search</button>
                  }
                >
                  {error.message}
                </Alert>
              ) : (
                <SearchResults
                  results={searchResults}
                  onProfileView={handleProfileView}
                  onProfileSave={handleProfileSave}
                  onProfileRemove={handleProfileRemove}
                  isLoading={searchStatus === 'SEARCHING'}
                  error={null}
                />
              )}
            </ResultsContainer>
          </Grid>
        </Grid>

        {/* WebSocket Status Indicator */}
        {wsStatus === 'ERROR' && (
          <Alert 
            severity="warning" 
            sx={{ mt: 2 }}
          >
            Real-time updates unavailable. Retrying connection...
          </Alert>
        )}
      </SearchContainer>
    </ErrorBoundary>
  );
};

// Export with error boundary wrapper
export default Search;