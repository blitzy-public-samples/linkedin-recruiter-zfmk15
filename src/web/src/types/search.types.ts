/**
 * @fileoverview TypeScript type definitions for LinkedIn profile search functionality
 * @version 1.0.0
 * @description Defines comprehensive types for search criteria, templates, results and related enums
 * Implements requirements from technical specifications sections 1.3 and 6.2
 */

import { Profile } from './profile.types';
import { UserRole } from './auth.types';

/**
 * Interface defining search criteria parameters for LinkedIn profile searches
 * Maps to boolean search capabilities specified in technical requirements
 */
export interface SearchCriteria {
  /** Keywords and boolean operators for search query */
  keywords: string;
  
  /** Geographic location filter, null indicates any location */
  location: string | null;
  
  /** Experience range filter in years */
  experienceYears: {
    min?: number;
    max?: number;
  };
  
  /** Required skills that must be present in profile */
  requiredSkills: string[];
  
  /** Optional/preferred skills to boost match score */
  optionalSkills: string[];
}

/**
 * Interface for saved search templates
 * Enables template management as specified in core features
 */
export interface SearchTemplate {
  /** Unique template identifier */
  id: string;
  
  /** Template name for reference */
  name: string;
  
  /** Search criteria configuration */
  criteria: SearchCriteria;
  
  /** User ID who created the template */
  createdBy: string;
  
  /** Template creation timestamp */
  createdAt: Date;
  
  /** Last modification timestamp */
  updatedAt: Date;
  
  /** Flag indicating if template is active */
  isActive: boolean;
}

/**
 * Interface for search results data
 * Contains paginated profile matches and metadata
 */
export interface SearchResults {
  /** Unique search execution identifier */
  id: string;
  
  /** Reference to search/template that generated results */
  searchId: string;
  
  /** Array of matching profiles with scores */
  profiles: Profile[];
  
  /** Total number of matches found */
  totalCount: number;
  
  /** Current page number (0-based) */
  page: number;
  
  /** Number of results per page */
  pageSize: number;
  
  /** Timestamp when search was executed */
  executedAt: Date;
}

/**
 * Enum defining possible states of search operation
 * Used for UI state management and progress indication
 */
export enum SearchStatus {
  /** No search in progress */
  IDLE = 'IDLE',
  
  /** Search operation executing */
  SEARCHING = 'SEARCHING',
  
  /** Search completed successfully */
  COMPLETED = 'COMPLETED',
  
  /** Search operation failed */
  FAILED = 'FAILED'
}

/**
 * Enum for available search result sort fields
 * Maps to sorting options in results grid
 */
export enum SearchSortField {
  /** Sort by AI-computed match score */
  MATCH_SCORE = 'MATCH_SCORE',
  
  /** Sort by years of experience */
  EXPERIENCE = 'EXPERIENCE',
  
  /** Sort by profile last activity date */
  LAST_ACTIVE = 'LAST_ACTIVE'
}

/**
 * Enum for sort order options
 * Used in combination with SearchSortField
 */
export enum SearchSortOrder {
  /** Ascending order (A-Z, 0-9) */
  ASC = 'ASC',
  
  /** Descending order (Z-A, 9-0) */
  DESC = 'DESC'
}