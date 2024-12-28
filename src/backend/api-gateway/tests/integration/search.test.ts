/**
 * @fileoverview Integration tests for LinkedIn profile search API endpoints
 * @version 1.0.0
 * @license MIT
 */

import request from 'supertest'; // v6.3.3
import { describe, it, beforeEach, afterEach, expect } from 'jest'; // v29.6.0
import { SearchController } from '../../src/controllers/search.controller';
import { SearchCriteria, SearchTemplate, SearchResponse, SearchResult } from '../../src/types/search.types';
import { ApiError } from '../../src/middleware/error.middleware';
import { loggerInstance as logger } from '../../src/utils/logger';
import { Express } from 'express';
import { StatusCodes } from 'http-status-codes';

// Test server setup
let app: Express;
let searchController: SearchController;
let mockAuthToken: string;

// Test data constants
const TEST_USER_ID = 'test-user-123';
const VALID_SEARCH_CRITERIA: SearchCriteria = {
  keywords: ['software engineer', 'full stack'],
  location: {
    countries: ['US'],
    cities: ['San Francisco'],
    remoteOnly: false,
    radius: 50,
    unit: 'mi'
  },
  experience: {
    minYears: 3,
    maxYears: 8,
    industries: ['software'],
    roles: ['engineer', 'developer'],
    seniority: 'senior'
  },
  skills: {
    required: ['JavaScript', 'Python', 'AWS'],
    preferred: ['React', 'Node.js'],
    weights: {
      JavaScript: 0.8,
      Python: 0.7,
      AWS: 0.6
    },
    minimumMatch: 0.7
  },
  booleanOperator: 'AND'
};

describe('Search API Integration Tests', () => {
  beforeEach(async () => {
    // Initialize test environment
    app = require('../../src/app').default;
    searchController = new SearchController();
    mockAuthToken = 'Bearer test-token-123';

    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = { id: TEST_USER_ID };
      next();
    });
  });

  afterEach(async () => {
    // Cleanup test data
    jest.clearAllMocks();
  });

  describe('POST /api/v1/search', () => {
    it('should initiate search with valid criteria and return 202', async () => {
      const response = await request(app)
        .post('/api/v1/search')
        .set('Authorization', mockAuthToken)
        .send(VALID_SEARCH_CRITERIA)
        .expect(StatusCodes.ACCEPTED);

      expect(response.body).toMatchObject({
        success: true,
        searchId: expect.any(String),
        message: 'Search initiated successfully'
      });
      expect(response.headers['x-search-id']).toBeDefined();
    });

    it('should enforce rate limiting', async () => {
      // Execute requests up to rate limit
      const requests = Array(101).fill(null).map(() =>
        request(app)
          .post('/api/v1/search')
          .set('Authorization', mockAuthToken)
          .send(VALID_SEARCH_CRITERIA)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(
        res => res.status === StatusCodes.TOO_MANY_REQUESTS
      );

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });

    it('should detect and handle PII in search criteria', async () => {
      const criteriaWithPII = {
        ...VALID_SEARCH_CRITERIA,
        keywords: ['john.doe@example.com', '123-45-6789']
      };

      const response = await request(app)
        .post('/api/v1/search')
        .set('Authorization', mockAuthToken)
        .send(criteriaWithPII)
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body.code).toBe('INVALID_SEARCH_CRITERIA');
    });
  });

  describe('GET /api/v1/search/:id/results', () => {
    let searchId: string;

    beforeEach(async () => {
      // Initialize a search to get results
      const response = await request(app)
        .post('/api/v1/search')
        .set('Authorization', mockAuthToken)
        .send(VALID_SEARCH_CRITERIA);
      
      searchId = response.body.searchId;
    });

    it('should retrieve paginated search results', async () => {
      const response = await request(app)
        .get(`/api/v1/search/${searchId}/results`)
        .set('Authorization', mockAuthToken)
        .query({ page: 1, pageSize: 20 })
        .expect(StatusCodes.OK);

      expect(response.body).toMatchObject({
        searchId: expect.any(String),
        results: expect.any(Array),
        totalResults: expect.any(Number),
        pageSize: 20,
        pageNumber: 1,
        totalPages: expect.any(Number),
        executionTime: expect.any(Number)
      });

      // Verify match accuracy requirement
      const matchScores = response.body.results.map((r: SearchResult) => r.matchScore);
      const averageScore = matchScores.reduce((a: number, b: number) => a + b, 0) / matchScores.length;
      expect(averageScore).toBeGreaterThanOrEqual(90);
    });

    it('should handle invalid search ID', async () => {
      await request(app)
        .get('/api/v1/search/invalid-id/results')
        .set('Authorization', mockAuthToken)
        .expect(StatusCodes.NOT_FOUND);
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get(`/api/v1/search/${searchId}/results`)
        .set('Authorization', mockAuthToken)
        .query({ page: 0, pageSize: 1000 })
        .expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/search/templates', () => {
    const templateData = {
      name: 'Senior Engineers SF',
      criteria: VALID_SEARCH_CRITERIA
    };

    it('should save search template successfully', async () => {
      const response = await request(app)
        .post('/api/v1/search/templates')
        .set('Authorization', mockAuthToken)
        .send(templateData)
        .expect(StatusCodes.CREATED);

      expect(response.body).toMatchObject({
        success: true,
        templateId: expect.any(String),
        message: 'Search template saved successfully'
      });
    });

    it('should validate template name uniqueness', async () => {
      // Create first template
      await request(app)
        .post('/api/v1/search/templates')
        .set('Authorization', mockAuthToken)
        .send(templateData);

      // Attempt to create duplicate
      await request(app)
        .post('/api/v1/search/templates')
        .set('Authorization', mockAuthToken)
        .send(templateData)
        .expect(StatusCodes.CONFLICT);
    });
  });

  describe('GET /api/v1/search/templates', () => {
    beforeEach(async () => {
      // Create test templates
      await request(app)
        .post('/api/v1/search/templates')
        .set('Authorization', mockAuthToken)
        .send({
          name: 'Template 1',
          criteria: VALID_SEARCH_CRITERIA
        });
    });

    it('should retrieve user templates with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/search/templates')
        .set('Authorization', mockAuthToken)
        .query({ page: 1, pageSize: 10 })
        .expect(StatusCodes.OK);

      expect(response.body).toMatchObject({
        success: true,
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            criteria: expect.any(Object),
            userId: TEST_USER_ID,
            createdAt: expect.any(String),
            lastUsed: expect.any(String),
            useCount: expect.any(Number)
          })
        ])
      });
    });

    it('should filter templates by name', async () => {
      const response = await request(app)
        .get('/api/v1/search/templates')
        .set('Authorization', mockAuthToken)
        .query({ search: 'Template 1' })
        .expect(StatusCodes.OK);

      expect(response.body.templates).toHaveLength(1);
      expect(response.body.templates[0].name).toBe('Template 1');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent searches within performance targets', async () => {
      const startTime = Date.now();
      const concurrentSearches = 100;

      const searches = Array(concurrentSearches).fill(null).map(() =>
        request(app)
          .post('/api/v1/search')
          .set('Authorization', mockAuthToken)
          .send(VALID_SEARCH_CRITERIA)
      );

      const responses = await Promise.all(searches);
      const executionTime = Date.now() - startTime;

      // Verify performance requirements
      expect(executionTime).toBeLessThan(30000); // 30 seconds max
      expect(responses.every(r => r.status === StatusCodes.ACCEPTED)).toBe(true);
    });

    it('should maintain response times under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 50; i++) {
        const startTime = Date.now();
        await request(app)
          .post('/api/v1/search')
          .set('Authorization', mockAuthToken)
          .send(VALID_SEARCH_CRITERIA);
        responseTimes.push(Date.now() - startTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      expect(averageResponseTime).toBeLessThan(1000); // 1 second max average
    });
  });
});