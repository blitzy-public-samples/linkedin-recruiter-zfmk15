/**
 * @fileoverview TypeScript type definitions for LinkedIn profile search operations
 * @version 1.0.0
 * @license MIT
 */

import { UUID } from 'crypto'; // Built-in Node.js crypto module for UUID types

/**
 * Location filtering criteria with support for remote work and radius-based search
 * @interface LocationFilter
 */
export interface LocationFilter {
  /** Array of country codes (ISO 3166-1 alpha-2) */
  countries: string[];
  /** Array of city names */
  cities: string[];
  /** Flag indicating if only remote positions should be considered */
  remoteOnly: boolean;
  /** Search radius from specified cities */
  radius: number;
  /** Unit of measurement for radius (kilometers or miles) */
  unit: 'km' | 'mi';
}

/**
 * Experience filtering criteria with industry and role targeting
 * @interface ExperienceFilter
 */
export interface ExperienceFilter {
  /** Minimum years of experience required */
  minYears: number;
  /** Maximum years of experience (optional) */
  maxYears: number;
  /** Target industries based on LinkedIn standardized industry codes */
  industries: string[];
  /** Specific job roles or titles */
  roles: string[];
  /** Career level/seniority */
  seniority: 'entry' | 'mid' | 'senior' | 'executive';
}

/**
 * Advanced skills filtering with weighting and minimum match requirements
 * @interface SkillsFilter
 */
export interface SkillsFilter {
  /** Must-have skills */
  required: string[];
  /** Nice-to-have skills */
  preferred: string[];
  /** Skill importance weights (0.0 to 1.0) */
  weights: Record<string, number>;
  /** Minimum percentage of required skills that must match */
  minimumMatch: number;
}

/**
 * Complete search criteria with boolean logic support
 * @interface SearchCriteria
 */
export interface SearchCriteria {
  /** Search keywords or phrases */
  keywords: string[];
  /** Location-based filtering */
  location: LocationFilter;
  /** Experience-based filtering */
  experience: ExperienceFilter;
  /** Skills-based filtering */
  skills: SkillsFilter;
  /** Boolean operator for combining multiple criteria */
  booleanOperator: 'AND' | 'OR';
}

/**
 * Search template with usage tracking
 * @interface SearchTemplate
 */
export interface SearchTemplate {
  /** Unique template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Search criteria configuration */
  criteria: SearchCriteria;
  /** Owner user identifier */
  userId: string;
  /** Template creation timestamp */
  createdAt: Date;
  /** Last usage timestamp */
  lastUsed: Date;
  /** Number of times template has been used */
  useCount: number;
}

/**
 * Detailed search result with granular matching scores
 * @interface SearchResult
 */
export interface SearchResult {
  /** LinkedIn profile identifier */
  profileId: string;
  /** Overall match score (0-100) */
  matchScore: number;
  /** Individual skill match scores */
  skillMatches: Record<string, number>;
  /** Experience criteria match score (0-100) */
  experienceMatch: number;
  /** Location criteria match score (0-100) */
  locationMatch: number;
  /** Result discovery timestamp */
  foundAt: Date;
}

/**
 * Comprehensive search response with metadata and performance metrics
 * @interface SearchResponse
 */
export interface SearchResponse {
  /** Unique search operation identifier */
  searchId: string;
  /** Array of search results */
  results: SearchResult[];
  /** Total number of results found */
  totalResults: number;
  /** Number of results per page */
  pageSize: number;
  /** Current page number */
  pageNumber: number;
  /** Total number of available pages */
  totalPages: number;
  /** Search execution time in milliseconds */
  executionTime: number;
  /** Search criteria used for this response */
  appliedFilters: SearchCriteria;
}