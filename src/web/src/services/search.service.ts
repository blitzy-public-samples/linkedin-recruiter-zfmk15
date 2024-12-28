/**
 * @file Enhanced LinkedIn Profile Search Service
 * @version 1.0.0
 * @description Production-ready service module for handling LinkedIn profile search operations
 * with advanced caching, rate limiting, and real-time updates
 * 
 * Dependencies:
 * - lodash: ^4.17.21
 */

import { debounce } from 'lodash';
import { ApiService } from './api.service';
import { WebSocketService } from './websocket.service';
import { 
  SearchCriteria, 
  SearchTemplate, 
  SearchResults, 
  SearchStatus,
  SearchSortField,
  SearchSortOrder 
} from '../types/search.types';

// Constants for search service configuration
const SEARCH_ENDPOINTS = {
  EXECUTE: '/search/execute',
  RESULTS: '/search/results',
  TEMPLATES: '/search/templates'
} as const;

const CACHE_CONFIG = {
  TTL: 300000, // 5 minutes
  MAX_ENTRIES: 100
};

const RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_MS: 3600000 // 1 hour
};

/**
 * Enhanced service class for managing LinkedIn profile searches
 * Implements caching, rate limiting, and real-time updates
 */
export class SearchService {
  private readonly apiService: ApiService;
  private readonly wsService: WebSocketService;
  private readonly searchListeners: Map<string, Set<Function>>;
  private readonly searchCache: Map<string, {
    data: SearchResults;
    timestamp: number;
  }>;
  private requestCount: number;
  private rateLimitReset: Date;

  /**
   * Initialize search service with enhanced monitoring and caching
   */
  constructor() {
    this.apiService = new ApiService();
    this.wsService = WebSocketService.getInstance();
    this.searchListeners = new Map();
    this.searchCache = new Map();
    this.requestCount = 0;
    this.rateLimitReset = new Date(Date.now() + RATE_LIMIT.WINDOW_MS);

    // Initialize WebSocket event handlers
    this.setupWebSocketHandlers();
  }

  /**
   * Execute a LinkedIn profile search with enhanced error handling and rate limiting
   * @param criteria Search criteria for profile matching
   * @returns Promise resolving to search ID
   */
  public async executeSearch(criteria: SearchCriteria): Promise<string> {
    try {
      // Check rate limiting
      await this.checkRateLimit();

      // Validate search criteria
      this.validateSearchCriteria(criteria);

      // Execute search
      const response = await this.apiService.post<{ searchId: string }>(
        SEARCH_ENDPOINTS.EXECUTE,
        criteria
      );

      // Setup real-time updates for this search
      this.setupSearchUpdates(response.searchId);

      return response.searchId;
    } catch (error) {
      console.error('Search execution failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve paginated search results with advanced filtering and sorting
   * @param searchId Search execution ID
   * @param page Page number (0-based)
   * @param pageSize Results per page
   * @param sortField Field to sort by
   * @param sortOrder Sort direction
   * @param filters Additional filter criteria
   */
  public async getSearchResults(
    searchId: string,
    page: number = 0,
    pageSize: number = 20,
    sortField: SearchSortField = SearchSortField.MATCH_SCORE,
    sortOrder: SearchSortOrder = SearchSortOrder.DESC,
    filters?: Record<string, unknown>
  ): Promise<SearchResults> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(searchId, page, pageSize, sortField, sortOrder, filters);
      const cachedResults = this.getCachedResults(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Fetch results from API
      const results = await this.apiService.get<SearchResults>(
        SEARCH_ENDPOINTS.RESULTS,
        {
          searchId,
          page,
          pageSize,
          sortField,
          sortOrder,
          ...filters
        }
      );

      // Cache results
      this.cacheResults(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Failed to fetch search results:', error);
      throw error;
    }
  }

  /**
   * Save search template for future use
   * @param template Search template to save
   */
  public async saveSearchTemplate(template: Omit<SearchTemplate, 'id'>): Promise<SearchTemplate> {
    try {
      return await this.apiService.post<SearchTemplate>(
        SEARCH_ENDPOINTS.TEMPLATES,
        template
      );
    } catch (error) {
      console.error('Failed to save search template:', error);
      throw error;
    }
  }

  /**
   * Retrieve saved search templates
   */
  public async getSearchTemplates(): Promise<SearchTemplate[]> {
    try {
      return await this.apiService.get<SearchTemplate[]>(SEARCH_ENDPOINTS.TEMPLATES);
    } catch (error) {
      console.error('Failed to fetch search templates:', error);
      throw error;
    }
  }

  /**
   * Delete saved search template
   * @param templateId Template ID to delete
   */
  public async deleteSearchTemplate(templateId: string): Promise<void> {
    try {
      await this.apiService.delete(`${SEARCH_ENDPOINTS.TEMPLATES}/${templateId}`);
    } catch (error) {
      console.error('Failed to delete search template:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time search updates
   * @param searchId Search ID to monitor
   * @param callback Update handler function
   */
  public subscribeToSearchUpdates(searchId: string, callback: Function): void {
    let listeners = this.searchListeners.get(searchId);
    if (!listeners) {
      listeners = new Set();
      this.searchListeners.set(searchId, listeners);
    }
    listeners.add(callback);
  }

  /**
   * Unsubscribe from search updates
   * @param searchId Search ID to unsubscribe from
   * @param callback Callback to remove
   */
  public unsubscribeFromSearchUpdates(searchId: string, callback: Function): void {
    const listeners = this.searchListeners.get(searchId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.searchListeners.delete(searchId);
      }
    }
  }

  /**
   * Setup WebSocket handlers for real-time updates
   */
  private setupWebSocketHandlers(): void {
    this.wsService.subscribe('search.started', (data) => {
      this.notifySearchListeners(data.searchId, SearchStatus.SEARCHING, data);
    });

    this.wsService.subscribe('profile.found', (data) => {
      this.notifySearchListeners(data.searchId, SearchStatus.SEARCHING, data);
      this.invalidateSearchCache(data.searchId);
    });

    this.wsService.subscribe('search.complete', (data) => {
      this.notifySearchListeners(data.searchId, SearchStatus.COMPLETED, data);
      this.invalidateSearchCache(data.searchId);
    });
  }

  /**
   * Validate search criteria
   * @param criteria Search criteria to validate
   */
  private validateSearchCriteria(criteria: SearchCriteria): void {
    if (!criteria.keywords?.trim()) {
      throw new Error('Search keywords are required');
    }

    if (criteria.experienceYears?.min && criteria.experienceYears?.max && 
        criteria.experienceYears.min > criteria.experienceYears.max) {
      throw new Error('Invalid experience range');
    }
  }

  /**
   * Check rate limit status
   */
  private async checkRateLimit(): Promise<void> {
    if (Date.now() > this.rateLimitReset.getTime()) {
      this.requestCount = 0;
      this.rateLimitReset = new Date(Date.now() + RATE_LIMIT.WINDOW_MS);
    }

    if (this.requestCount >= RATE_LIMIT.MAX_REQUESTS) {
      throw new Error('Rate limit exceeded');
    }

    this.requestCount++;
  }

  /**
   * Generate cache key for search results
   */
  private generateCacheKey(
    searchId: string,
    page: number,
    pageSize: number,
    sortField: SearchSortField,
    sortOrder: SearchSortOrder,
    filters?: Record<string, unknown>
  ): string {
    return JSON.stringify({
      searchId,
      page,
      pageSize,
      sortField,
      sortOrder,
      filters
    });
  }

  /**
   * Get cached search results if valid
   */
  private getCachedResults(cacheKey: string): SearchResults | null {
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache search results with TTL
   */
  private cacheResults(cacheKey: string, results: SearchResults): void {
    // Implement LRU cache eviction if needed
    if (this.searchCache.size >= CACHE_CONFIG.MAX_ENTRIES) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }

    this.searchCache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a specific search
   */
  private invalidateSearchCache(searchId: string): void {
    for (const key of this.searchCache.keys()) {
      if (key.includes(searchId)) {
        this.searchCache.delete(key);
      }
    }
  }

  /**
   * Notify search update listeners
   */
  private notifySearchListeners = debounce(
    (searchId: string, status: SearchStatus, data: any) => {
      const listeners = this.searchListeners.get(searchId);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(status, data);
          } catch (error) {
            console.error('Search listener callback failed:', error);
          }
        });
      }
    },
    100,
    { maxWait: 1000 }
  );
}

// Export singleton instance
export const searchService = new SearchService();