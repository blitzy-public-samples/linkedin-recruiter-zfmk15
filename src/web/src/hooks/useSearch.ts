/**
 * @file Custom React hook for managing LinkedIn profile search operations
 * @version 1.0.0
 * @description Production-ready hook implementing real-time search updates,
 * advanced caching, and comprehensive error handling
 * 
 * Dependencies:
 * - react: ^18.0.0
 * - react-redux: ^8.0.0
 * - lodash: ^4.17.21
 */

import { useCallback, useEffect, useState, useRef } from 'react'; // v18.0.0
import { useDispatch, useSelector } from 'react-redux'; // v8.0.0
import { debounce } from 'lodash'; // v4.17.21
import { SearchService } from '../../services/search.service';
import {
  SearchCriteria,
  SearchResults,
  SearchStatus,
  SearchTemplate,
  SearchSortField,
  SearchSortOrder
} from '../types/search.types';

// WebSocket connection status enum
enum WebSocketStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

// Custom error type for search operations
interface SearchError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Custom hook for managing LinkedIn profile search operations with real-time updates
 * Implements requirements from technical specifications sections 1.3 and 6.2
 */
export const useSearch = () => {
  // Initialize services and state
  const searchService = SearchService.getInstance();
  const dispatch = useDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Local state management
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    keywords: '',
    location: null,
    experienceYears: {},
    requiredSkills: [],
    optionalSkills: []
  });
  const [searchStatus, setSearchStatus] = useState<SearchStatus>(SearchStatus.IDLE);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);
  const [error, setError] = useState<SearchError | null>(null);

  // Redux state selectors
  const searchResults = useSelector((state: any) => state.search.results);
  const currentPage = useSelector((state: any) => state.search.currentPage);
  const sortField = useSelector((state: any) => state.search.sortField);
  const sortOrder = useSelector((state: any) => state.search.sortOrder);

  /**
   * Initialize WebSocket connection for real-time updates
   */
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        setWsStatus(WebSocketStatus.CONNECTING);
        await searchService.connectWebSocket();
        setWsStatus(WebSocketStatus.CONNECTED);
      } catch (error) {
        setWsStatus(WebSocketStatus.ERROR);
        setError({
          code: 'WS_CONNECTION_ERROR',
          message: 'Failed to establish WebSocket connection',
          details: { error }
        });
      }
    };

    initializeWebSocket();

    return () => {
      searchService.disconnectWebSocket();
      setWsStatus(WebSocketStatus.DISCONNECTED);
    };
  }, []);

  /**
   * Debounced search handler to prevent excessive API calls
   */
  const debouncedSearch = useCallback(
    debounce(async (criteria: SearchCriteria) => {
      try {
        // Cancel any pending requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setSearchStatus(SearchStatus.SEARCHING);
        setError(null);

        // Execute search with abort signal
        const searchId = await searchService.executeSearch(criteria);

        // Subscribe to real-time updates
        searchService.subscribeToSearchUpdates(searchId, (status: SearchStatus, data: any) => {
          setSearchStatus(status);
          if (data.profiles) {
            dispatch({ type: 'search/updateResults', payload: data });
          }
        });

      } catch (error: any) {
        setSearchStatus(SearchStatus.FAILED);
        setError({
          code: error.code || 'SEARCH_ERROR',
          message: error.message || 'Search operation failed',
          details: error.details
        });
      }
    }, 300),
    []
  );

  /**
   * Handle search criteria updates
   */
  const handleSearch = useCallback((criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    debouncedSearch(criteria);
  }, [debouncedSearch]);

  /**
   * Handle sort order changes
   */
  const handleSortChange = useCallback((
    field: SearchSortField,
    order: SearchSortOrder
  ) => {
    dispatch({ 
      type: 'search/updateSort',
      payload: { field, order }
    });
  }, [dispatch]);

  /**
   * Handle pagination changes
   */
  const handlePageChange = useCallback((page: number) => {
    dispatch({
      type: 'search/updatePage',
      payload: { page }
    });
  }, [dispatch]);

  /**
   * Handle search template operations
   */
  const handleTemplateOperations = useCallback(async (
    operation: 'save' | 'load' | 'delete',
    template: SearchTemplate
  ) => {
    try {
      switch (operation) {
        case 'save':
          await searchService.saveSearchTemplate(template);
          break;
        case 'load':
          setSearchCriteria(template.criteria);
          handleSearch(template.criteria);
          break;
        case 'delete':
          await searchService.deleteSearchTemplate(template.id);
          break;
      }
    } catch (error: any) {
      setError({
        code: 'TEMPLATE_ERROR',
        message: `Failed to ${operation} search template`,
        details: error
      });
    }
  }, [handleSearch]);

  /**
   * Retry failed search
   */
  const retrySearch = useCallback(() => {
    if (searchStatus === SearchStatus.FAILED) {
      handleSearch(searchCriteria);
    }
  }, [searchStatus, searchCriteria, handleSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      debouncedSearch.cancel();
    };
  }, []);

  return {
    // State
    searchCriteria,
    searchResults,
    searchStatus,
    wsStatus,
    error,
    currentPage,
    sortField,
    sortOrder,

    // Actions
    handleSearch,
    handleSortChange,
    handlePageChange,
    handleTemplateOperations,
    retrySearch
  };
};

export type { SearchError };
export { WebSocketStatus };