/**
 * @file Redux slice for LinkedIn profile search state management
 * @version 1.0.0
 * @description Manages comprehensive search state with real-time updates,
 * caching, and template management capabilities
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { SearchCriteria } from '../../types/search.types';
import { SearchService } from '../../services/search.service';

// WebSocket connection status enum
export enum WebSocketStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

// Enhanced search state interface
interface SearchState {
  currentCriteria: SearchCriteria | null;
  templates: SearchTemplate[];
  results: SearchResults | null;
  status: SearchStatus;
  error: string | null;
  sortField: SearchSortField;
  sortOrder: SearchSortOrder;
  currentPage: number;
  pageSize: number;
  websocketStatus: WebSocketStatus;
  resultCache: Record<string, {
    data: SearchResults;
    timestamp: number;
  }>;
  searchHistory: {
    id: string;
    criteria: SearchCriteria;
    timestamp: number;
  }[];
}

// Cache configuration
const CACHE_CONFIG = {
  TTL: 300000, // 5 minutes
  MAX_ENTRIES: 50
};

// Initial state
const initialState: SearchState = {
  currentCriteria: null,
  templates: [],
  results: null,
  status: SearchStatus.IDLE,
  error: null,
  sortField: SearchSortField.MATCH_SCORE,
  sortOrder: SearchSortOrder.DESC,
  currentPage: 0,
  pageSize: 20,
  websocketStatus: WebSocketStatus.DISCONNECTED,
  resultCache: {},
  searchHistory: []
};

/**
 * Async thunk for initiating a new search with WebSocket support
 */
export const initiateSearch = createAsyncThunk(
  'search/initiate',
  async (criteria: SearchCriteria, { dispatch, rejectWithValue }) => {
    try {
      // Validate search criteria
      if (!criteria.keywords?.trim()) {
        throw new Error('Search keywords are required');
      }

      const searchService = SearchService.getInstance();

      // Update search status
      dispatch(setSearchStatus(SearchStatus.SEARCHING));

      // Initialize WebSocket connection
      dispatch(updateWebSocketStatus(WebSocketStatus.CONNECTING));
      await searchService.connectWebSocket();
      dispatch(updateWebSocketStatus(WebSocketStatus.CONNECTED));

      // Execute search
      const searchId = await searchService.initiateSearch(criteria);

      // Subscribe to real-time updates
      searchService.subscribeToSearchUpdates(searchId, (status: SearchStatus, data: any) => {
        dispatch(handleSearchUpdate({ status, data }));
      });

      return searchId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Search failed');
    }
  }
);

/**
 * Async thunk for fetching paginated search results with caching
 */
export const fetchSearchResults = createAsyncThunk(
  'search/fetchResults',
  async ({ 
    searchId, 
    page, 
    pageSize, 
    sortField, 
    sortOrder 
  }: {
    searchId: string;
    page: number;
    pageSize: number;
    sortField: SearchSortField;
    sortOrder: SearchSortOrder;
  }, { getState, rejectWithValue }) => {
    try {
      const searchService = SearchService.getInstance();

      // Generate cache key
      const cacheKey = `${searchId}-${page}-${pageSize}-${sortField}-${sortOrder}`;
      
      // Check cache
      const state = getState() as { search: SearchState };
      const cachedResult = state.search.resultCache[cacheKey];
      
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_CONFIG.TTL) {
        return cachedResult.data;
      }

      // Fetch fresh results
      const results = await searchService.getSearchResults(
        searchId,
        page,
        pageSize,
        sortField,
        sortOrder
      );

      return results;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch results');
    }
  }
);

// Create the search slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchCriteria: (state, action: PayloadAction<SearchCriteria>) => {
      state.currentCriteria = action.payload;
      state.currentPage = 0; // Reset pagination
    },
    setSearchStatus: (state, action: PayloadAction<SearchStatus>) => {
      state.status = action.payload;
    },
    updateWebSocketStatus: (state, action: PayloadAction<WebSocketStatus>) => {
      state.websocketStatus = action.payload;
    },
    handleSearchUpdate: (state, action: PayloadAction<{
      status: SearchStatus;
      data: any;
    }>) => {
      const { status, data } = action.payload;
      state.status = status;
      
      if (data.profiles) {
        if (!state.results) {
          state.results = {
            id: data.searchId,
            profiles: [],
            totalCount: 0,
            page: 0,
            pageSize: state.pageSize
          };
        }
        state.results.profiles = [...state.results.profiles, ...data.profiles];
        state.results.totalCount = data.totalCount;
      }
    },
    updateResultCache: (state, action: PayloadAction<{
      key: string;
      data: SearchResults;
    }>) => {
      const { key, data } = action.payload;
      
      // Implement LRU cache eviction if needed
      if (Object.keys(state.resultCache).length >= CACHE_CONFIG.MAX_ENTRIES) {
        const oldestKey = Object.keys(state.resultCache)[0];
        delete state.resultCache[oldestKey];
      }

      state.resultCache[key] = {
        data,
        timestamp: Date.now()
      };
    },
    setSortCriteria: (state, action: PayloadAction<{
      field: SearchSortField;
      order: SearchSortOrder;
    }>) => {
      state.sortField = action.payload.field;
      state.sortOrder = action.payload.order;
      state.currentPage = 0; // Reset pagination
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    clearSearchHistory: (state) => {
      state.searchHistory = [];
    },
    resetSearch: (state) => {
      return {
        ...initialState,
        templates: state.templates, // Preserve templates
        resultCache: state.resultCache // Preserve cache
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiateSearch.pending, (state) => {
        state.status = SearchStatus.SEARCHING;
        state.error = null;
      })
      .addCase(initiateSearch.fulfilled, (state, action) => {
        // Add to search history
        state.searchHistory.unshift({
          id: action.payload,
          criteria: state.currentCriteria!,
          timestamp: Date.now()
        });
        
        // Limit history size
        if (state.searchHistory.length > 10) {
          state.searchHistory.pop();
        }
      })
      .addCase(initiateSearch.rejected, (state, action) => {
        state.status = SearchStatus.FAILED;
        state.error = action.payload as string;
      })
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.results = action.payload;
        state.error = null;
      })
      .addCase(fetchSearchResults.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

// Export actions and reducer
export const {
  setSearchCriteria,
  setSearchStatus,
  updateWebSocketStatus,
  handleSearchUpdate,
  updateResultCache,
  setSortCriteria,
  setPage,
  clearSearchHistory,
  resetSearch
} = searchSlice.actions;

export default searchSlice.reducer;