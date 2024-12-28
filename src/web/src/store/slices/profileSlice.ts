/**
 * @file Redux Toolkit slice for LinkedIn profile data management
 * @version 1.0.0
 * Dependencies:
 * - @reduxjs/toolkit: ^1.9.0
 */

import { 
  createSlice, 
  createAsyncThunk, 
  createSelector,
  PayloadAction 
} from '@reduxjs/toolkit';
import { Profile, ProfileAnalysis, ApiError } from '../../types/profile.types';
import { ProfileService } from '../../services/profile.service';
import { handleApiError, retryWithBackoff } from '../../utils/errorHandling';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Rate limiting window in milliseconds (1 minute)
const RATE_LIMIT_WINDOW = 60 * 1000;

// Maximum requests per window
const MAX_REQUESTS = 100;

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000
};

/**
 * Interface for profile slice state
 */
interface ProfileState {
  profiles: Record<string, Profile>;
  selectedProfileId: string | null;
  loading: boolean;
  error: ApiError | null;
  analysisInProgress: Record<string, boolean>;
  cache: Record<string, { data: Profile; timestamp: number }>;
  requestCount: Record<string, { count: number; resetTime: number }>;
}

/**
 * Initial state for profile slice
 */
const initialState: ProfileState = {
  profiles: {},
  selectedProfileId: null,
  loading: false,
  error: null,
  analysisInProgress: {},
  cache: {},
  requestCount: {}
};

/**
 * Async thunk for fetching a single profile
 */
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (profileId: string, { getState, rejectWithValue }) => {
    try {
      // Check cache
      const state = getState() as { profile: ProfileState };
      const cached = state.profile.cache[profileId];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      // Check rate limit
      const requestTracker = state.profile.requestCount[profileId] || {
        count: 0,
        resetTime: Date.now() + RATE_LIMIT_WINDOW
      };

      if (requestTracker.count >= MAX_REQUESTS && Date.now() < requestTracker.resetTime) {
        throw new Error('Rate limit exceeded');
      }

      // Fetch profile with retry logic
      const profileService = ProfileService.getInstance();
      const profile = await retryWithBackoff(
        () => profileService.getProfile(profileId),
        RETRY_CONFIG
      );

      return profile;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Async thunk for fetching multiple profiles
 */
export const fetchProfiles = createAsyncThunk(
  'profile/fetchProfiles',
  async (profileIds: string[], { dispatch }) => {
    const profiles: Profile[] = [];
    for (const id of profileIds) {
      try {
        const profile = await dispatch(fetchProfile(id)).unwrap();
        profiles.push(profile);
      } catch (error) {
        console.error(`Failed to fetch profile ${id}:`, error);
      }
    }
    return profiles;
  }
);

/**
 * Async thunk for requesting profile analysis
 */
export const analyzeProfile = createAsyncThunk(
  'profile/analyzeProfile',
  async (profileId: string, { dispatch, rejectWithValue }) => {
    try {
      const profileService = ProfileService.getInstance();
      await profileService.requestAnalysis(profileId, { waitForComplete: true });
      const profile = await dispatch(fetchProfile(profileId)).unwrap();
      return profile;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Profile slice definition
 */
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setSelectedProfile: (state, action: PayloadAction<string | null>) => {
      state.selectedProfileId = action.payload;
    },
    clearCache: (state) => {
      state.cache = {};
      state.requestCount = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProfileStatus: (state, action: PayloadAction<{ id: string; isActive: boolean }>) => {
      const profile = state.profiles[action.payload.id];
      if (profile) {
        profile.isActive = action.payload.isActive;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchProfile reducers
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles[action.payload.id] = action.payload;
        state.cache[action.payload.id] = {
          data: action.payload,
          timestamp: Date.now()
        };
        
        // Update request count
        const tracker = state.requestCount[action.payload.id] || {
          count: 0,
          resetTime: Date.now() + RATE_LIMIT_WINDOW
        };
        tracker.count++;
        state.requestCount[action.payload.id] = tracker;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      })
      // analyzeProfile reducers
      .addCase(analyzeProfile.pending, (state, action) => {
        state.analysisInProgress[action.meta.arg] = true;
      })
      .addCase(analyzeProfile.fulfilled, (state, action) => {
        state.analysisInProgress[action.meta.arg] = false;
        state.profiles[action.payload.id] = action.payload;
      })
      .addCase(analyzeProfile.rejected, (state, action) => {
        state.analysisInProgress[action.meta.arg] = false;
        state.error = action.payload as ApiError;
      });
  }
});

// Export actions
export const { 
  setSelectedProfile, 
  clearCache, 
  clearError,
  updateProfileStatus 
} = profileSlice.actions;

// Memoized selectors
export const selectProfileById = createSelector(
  [(state: { profile: ProfileState }) => state.profile.profiles, 
   (_, profileId: string) => profileId],
  (profiles, profileId) => profiles[profileId]
);

export const selectProfilesWithAnalysis = createSelector(
  [(state: { profile: ProfileState }) => state.profile.profiles],
  (profiles) => Object.values(profiles).filter(p => p.lastAnalyzedAt !== null)
);

export const selectAnalysisInProgress = createSelector(
  [(state: { profile: ProfileState }) => state.profile.analysisInProgress,
   (_, profileId: string) => profileId],
  (analysisInProgress, profileId) => analysisInProgress[profileId] || false
);

// Export reducer
export default profileSlice.reducer;