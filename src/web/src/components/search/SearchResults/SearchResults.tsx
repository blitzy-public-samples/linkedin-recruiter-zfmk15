import React, { useCallback, useMemo } from 'react'; // v18.0+
import { 
  Grid, 
  Select, 
  MenuItem, 
  Pagination, 
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material'; // v5.14+
import { styled, useTheme } from '@mui/material/styles'; // v5.14+
import { useVirtual } from 'react-virtual'; // v2.10+

import ProfileCard from '../../profile/ProfileCard/ProfileCard';
import { useSearch } from '../../../hooks/useSearch';
import { SearchResults, SearchSortField, SearchSortOrder } from '../../../types/search.types';

// Props interface with comprehensive configuration
interface SearchResultsProps {
  results: SearchResults | null;
  onProfileView: (id: string) => Promise<void>;
  onProfileSave: (id: string) => Promise<void>;
  onProfileRemove: (id: string) => Promise<void>;
  className?: string;
  isLoading?: boolean;
  error: Error | null;
}

// Styled grid container with responsive layout
const StyledGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2),
  minHeight: '200px',
  width: '100%',
  position: 'relative',
  // Responsive spacing
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },
}));

// Styled sort select with accessibility enhancements
const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: 200,
  marginBottom: theme.spacing(2),
  '& .MuiSelect-select': {
    paddingY: theme.spacing(1),
  },
}));

// Main search results component with virtualization and accessibility
export const SearchResults: React.FC<SearchResultsProps> = React.memo(({
  results,
  onProfileView,
  onProfileSave,
  onProfileRemove,
  className,
  isLoading = false,
  error
}) => {
  const theme = useTheme();
  const { handleSortChange, handlePageChange } = useSearch();

  // Setup virtualization for large result sets
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtual({
    size: results?.profiles.length || 0,
    parentRef,
    estimateSize: useCallback(() => 200, []), // Estimated card height
    overscan: 5 // Number of items to render outside viewport
  });

  // Memoized sort options
  const sortOptions = useMemo(() => [
    { value: SearchSortField.MATCH_SCORE, label: 'Match Score' },
    { value: SearchSortField.EXPERIENCE, label: 'Experience' },
    { value: SearchSortField.LAST_ACTIVE, label: 'Last Active' }
  ], []);

  // Handle sort change with analytics tracking
  const onSortChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    handleSortChange(
      event.target.value as SearchSortField,
      SearchSortOrder.DESC
    );
  }, [handleSortChange]);

  // Handle pagination with analytics tracking
  const onPageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    handlePageChange(page - 1); // Convert to 0-based index
  }, [handlePageChange]);

  // Error display component
  if (error) {
    return (
      <Alert 
        severity="error"
        sx={{ margin: theme.spacing(2) }}
        role="alert"
      >
        {error.message}
      </Alert>
    );
  }

  // Loading state with accessibility
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400
        }}
        role="status"
        aria-label="Loading search results"
      >
        <CircularProgress />
      </Box>
    );
  }

  // No results state
  if (!results?.profiles.length) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          padding: theme.spacing(4)
        }}
        role="status"
      >
        <Typography variant="h6" gutterBottom>
          No profiles found
        </Typography>
        <Typography color="textSecondary">
          Try adjusting your search criteria
        </Typography>
      </Box>
    );
  }

  return (
    <StyledGrid container className={className} role="region" aria-label="Search Results">
      {/* Results header with count and sorting */}
      <Grid item xs={12} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            {`${results.totalCount} profiles found`}
          </Typography>
          
          <StyledSelect
            value={SearchSortField.MATCH_SCORE}
            onChange={onSortChange}
            aria-label="Sort results by"
            id="sort-select"
          >
            {sortOptions.map(option => (
              <MenuItem 
                key={option.value} 
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ))}
          </StyledSelect>
        </Box>
      </Grid>

      {/* Virtualized results grid */}
      <Grid 
        item 
        xs={12} 
        ref={parentRef} 
        sx={{ 
          height: '600px',
          overflowY: 'auto'
        }}
      >
        <Grid container spacing={2}>
          {rowVirtualizer.virtualItems.map(virtualRow => {
            const profile = results.profiles[virtualRow.index];
            return (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4} 
                key={profile.id}
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <ProfileCard
                  profile={profile}
                  onView={() => onProfileView(profile.id)}
                  onFavorite={() => onProfileSave(profile.id)}
                  onShare={() => onProfileRemove(profile.id)}
                  testId={`profile-card-${profile.id}`}
                />
              </Grid>
            );
          })}
        </Grid>
      </Grid>

      {/* Pagination controls */}
      {results.totalCount > results.pageSize && (
        <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(results.totalCount / results.pageSize)}
            page={results.page + 1} // Convert from 0-based index
            onChange={onPageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            aria-label="Search results pagination"
          />
        </Grid>
      )}
    </StyledGrid>
  );
});

// Display name for debugging
SearchResults.displayName = 'SearchResults';

export default SearchResults;