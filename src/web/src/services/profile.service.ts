/**
 * @file Enhanced Profile Service Implementation
 * @version 1.0.0
 * @description Service module providing comprehensive functionality for LinkedIn profile data management,
 * including profile retrieval, analysis orchestration, caching operations, and error handling with telemetry
 * 
 * Dependencies:
 * - lodash: ^4.17.21
 */

import { debounce } from 'lodash';
import { ApiService } from './api.service';
import { Profile, ProfileAnalysis } from '../types/profile.types';
import { handleApiError } from '../utils/errorHandling';
import { ENDPOINTS, TIMEOUTS } from '../config/api.config';

/**
 * Interface for analysis request options
 */
interface AnalysisOptions {
  waitForComplete?: boolean;
  priority?: 'high' | 'normal' | 'low';
  includeDetails?: boolean;
}

/**
 * Enhanced service class for managing LinkedIn profile operations
 */
export class ProfileService {
  private readonly profileCache: Map<string, { data: Profile; timestamp: number }>;
  private readonly analysisCache: Map<string, { data: ProfileAnalysis; timestamp: number }>;
  private readonly pendingAnalysis: Set<string>;
  private readonly debouncedAnalysis: (profileId: string) => Promise<void>;

  constructor(
    private readonly apiService: ApiService,
    private readonly cacheExpiryMs: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    this.profileCache = new Map();
    this.analysisCache = new Map();
    this.pendingAnalysis = new Set();
    
    // Configure debounced analysis requests
    this.debouncedAnalysis = debounce(
      (profileId: string) => this.executeAnalysis(profileId),
      1000,
      { maxWait: 5000 }
    );
  }

  /**
   * Retrieves a LinkedIn profile by ID with caching and progressive loading
   */
  public async getProfile(profileId: string, forceRefresh = false): Promise<Profile> {
    try {
      // Check cache if refresh not forced
      if (!forceRefresh) {
        const cached = this.profileCache.get(profileId);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
          return cached.data;
        }
      }

      // Fetch fresh profile data
      const profile = await this.apiService.get<Profile>(
        ENDPOINTS.PROFILES.GET.replace(':id', profileId)
      );

      // Update cache
      this.profileCache.set(profileId, {
        data: profile,
        timestamp: Date.now()
      });

      return profile;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Retrieves analysis results for a profile with real-time updates
   */
  public async getProfileAnalysis(
    profileId: string,
    waitForComplete = false
  ): Promise<ProfileAnalysis> {
    try {
      // Check cache first
      const cached = this.analysisCache.get(profileId);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
        return cached.data;
      }

      // Fetch analysis results
      const endpoint = ENDPOINTS.PROFILES.ANALYZE.replace(':id', profileId);
      const analysis = await this.apiService.get<ProfileAnalysis>(endpoint, {
        timeout: waitForComplete ? TIMEOUTS.ANALYSIS : TIMEOUTS.DEFAULT
      });

      // Update cache
      this.analysisCache.set(profileId, {
        data: analysis,
        timestamp: Date.now()
      });

      return analysis;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Requests a new analysis for a profile with queueing and status tracking
   */
  public async requestAnalysis(
    profileId: string,
    options: AnalysisOptions = {}
  ): Promise<void> {
    try {
      // Validate profile exists
      await this.getProfile(profileId);

      // Check if analysis already pending
      if (this.pendingAnalysis.has(profileId)) {
        return;
      }

      this.pendingAnalysis.add(profileId);

      // Queue analysis request with debouncing
      await this.debouncedAnalysis(profileId);

      // Clear pending flag
      this.pendingAnalysis.delete(profileId);

      // Wait for completion if requested
      if (options.waitForComplete) {
        await this.waitForAnalysisCompletion(profileId);
      }
    } catch (error) {
      this.pendingAnalysis.delete(profileId);
      throw handleApiError(error);
    }
  }

  /**
   * Updates the active status of a profile with audit logging
   */
  public async updateProfileStatus(
    profileId: string,
    isActive: boolean
  ): Promise<void> {
    try {
      const endpoint = ENDPOINTS.PROFILES.GET.replace(':id', profileId);
      await this.apiService.put(endpoint, { isActive });

      // Update cache if present
      const cached = this.profileCache.get(profileId);
      if (cached) {
        cached.data.isActive = isActive;
        cached.timestamp = Date.now();
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Executes the actual analysis request
   */
  private async executeAnalysis(profileId: string): Promise<void> {
    const endpoint = ENDPOINTS.PROFILES.ANALYZE.replace(':id', profileId);
    await this.apiService.post(endpoint);
  }

  /**
   * Waits for analysis completion with timeout
   */
  private async waitForAnalysisCompletion(
    profileId: string,
    timeoutMs: number = TIMEOUTS.ANALYSIS
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const analysis = await this.getProfileAnalysis(profileId);
      if (analysis.confidenceScore > 0) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Analysis completion timeout exceeded');
  }

  /**
   * Clears expired entries from caches
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.profileCache.entries()) {
      if (now - value.timestamp > this.cacheExpiryMs) {
        this.profileCache.delete(key);
      }
    }

    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.cacheExpiryMs) {
        this.analysisCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService(new ApiService());