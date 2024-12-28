/**
 * @fileoverview Mock Service Worker (MSW) request handlers for API testing
 * @version 1.0.0
 * @description Implements realistic mock API behavior for frontend testing with
 * type-safe responses, simulated latency, and stateful interactions
 */

import { rest } from 'msw'; // msw@1.2.0
import { LoginRequest } from '../../src/types/auth.types';
import { SearchCriteria } from '../../src/types/search.types';
import { Profile } from '../../src/types/profile.types';

// API endpoint constants for consistent route definitions
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh'
  },
  SEARCH: {
    EXECUTE: '/api/v1/search/execute',
    RESULTS: '/api/v1/search/results',
    TEMPLATES: '/api/v1/search/templates'
  },
  PROFILE: {
    GET: '/api/v1/profiles/:id',
    ANALYSIS: '/api/v1/profiles/:id/analysis',
    STATUS: '/api/v1/profiles/:id/status'
  }
} as const;

// Mock response data
const MOCK_RESPONSES = {
  AUTH: {
    TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    USER: {
      id: 'mock-user-1',
      email: 'recruiter@example.com',
      role: 'RECRUITER',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    }
  },
  PROFILES: [
    {
      id: 'profile-1',
      linkedinUrl: 'https://linkedin.com/in/test-profile-1',
      fullName: 'John Developer',
      currentRole: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      experience: {
        years: 8,
        details: ['Full Stack Development', 'Cloud Architecture']
      },
      matchScore: 0.92
    }
  ]
} as const;

/**
 * Creates mock handlers for authentication endpoints
 * Implements login, logout, and token refresh with validation
 */
const mockAuthHandlers = [
  // Login endpoint handler
  rest.post(API_ENDPOINTS.AUTH.LOGIN, async (req, res, ctx) => {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 600 + 200));

    const body = await req.json() as LoginRequest;

    // Validate request body
    if (!body.email || !body.password) {
      return res(
        ctx.status(400),
        ctx.json({
          error: 'Invalid request body',
          message: 'Email and password are required'
        })
      );
    }

    // Mock successful login
    if (body.email === 'recruiter@example.com' && body.password === 'test123') {
      return res(
        ctx.status(200),
        ctx.json({
          token: MOCK_RESPONSES.AUTH.TOKEN,
          user: MOCK_RESPONSES.AUTH.USER,
          expiresIn: 3600
        })
      );
    }

    // Mock authentication failure
    return res(
      ctx.status(401),
      ctx.json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      })
    );
  }),

  // Logout endpoint handler
  rest.post(API_ENDPOINTS.AUTH.LOGOUT, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          error: 'Unauthorized',
          message: 'Missing or invalid token'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({ message: 'Logged out successfully' })
    );
  }),

  // Token refresh handler
  rest.post(API_ENDPOINTS.AUTH.REFRESH, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          error: 'Unauthorized',
          message: 'Invalid refresh token'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        token: MOCK_RESPONSES.AUTH.TOKEN,
        expiresIn: 3600
      })
    );
  })
];

/**
 * Creates mock handlers for search-related endpoints
 * Implements search execution, results pagination, and template management
 */
const mockSearchHandlers = [
  // Search execution endpoint
  rest.post(API_ENDPOINTS.SEARCH.EXECUTE, async (req, res, ctx) => {
    const body = await req.json() as SearchCriteria;
    
    // Validate search criteria
    if (!body.keywords?.trim()) {
      return res(
        ctx.status(400),
        ctx.json({
          error: 'Invalid search criteria',
          message: 'Keywords are required'
        })
      );
    }

    // Mock successful search with paginated results
    return res(
      ctx.status(200),
      ctx.json({
        id: 'search-1',
        profiles: MOCK_RESPONSES.PROFILES,
        totalCount: MOCK_RESPONSES.PROFILES.length,
        page: 0,
        pageSize: 10,
        executedAt: new Date().toISOString()
      })
    );
  }),

  // Search results endpoint with pagination
  rest.get(API_ENDPOINTS.SEARCH.RESULTS, (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 0;
    const pageSize = Number(req.url.searchParams.get('pageSize')) || 10;

    return res(
      ctx.status(200),
      ctx.json({
        profiles: MOCK_RESPONSES.PROFILES,
        totalCount: MOCK_RESPONSES.PROFILES.length,
        page,
        pageSize
      })
    );
  })
];

/**
 * Creates mock handlers for profile management endpoints
 * Implements profile retrieval, analysis, and status updates
 */
const mockProfileHandlers = [
  // Get profile by ID
  rest.get(API_ENDPOINTS.PROFILE.GET, (req, res, ctx) => {
    const { id } = req.params;

    const profile = MOCK_RESPONSES.PROFILES.find(p => p.id === id);
    
    if (!profile) {
      return res(
        ctx.status(404),
        ctx.json({
          error: 'Not found',
          message: 'Profile not found'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json(profile)
    );
  }),

  // Get profile analysis
  rest.get(API_ENDPOINTS.PROFILE.ANALYSIS, (req, res, ctx) => {
    const { id } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        profileId: id,
        skillMatch: {
          'JavaScript': 0.95,
          'React': 0.90,
          'Node.js': 0.85
        },
        experienceScore: 0.88,
        educationScore: 0.85,
        overallScore: 0.89,
        confidenceScore: 0.92,
        analyzedAt: new Date().toISOString()
      })
    );
  }),

  // Update profile status
  rest.patch(API_ENDPOINTS.PROFILE.STATUS, async (req, res, ctx) => {
    const { id } = req.params;
    const body = await req.json();

    if (!body.status) {
      return res(
        ctx.status(400),
        ctx.json({
          error: 'Invalid request',
          message: 'Status is required'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        id,
        status: body.status,
        updatedAt: new Date().toISOString()
      })
    );
  })
];

// Export combined handlers array for MSW setup
export const handlers = [
  ...mockAuthHandlers,
  ...mockSearchHandlers,
  ...mockProfileHandlers
];