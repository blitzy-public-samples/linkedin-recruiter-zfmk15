/**
 * @fileoverview Enhanced LinkedIn profile search routes with comprehensive security features
 * @version 1.0.0
 * @license MIT
 */

import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.0.0
import helmet from 'helmet'; // v4.6.0

// Internal imports
import { SearchController } from '../controllers/search.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateSearchCriteria, validateSearchTemplate } from '../middleware/validation.middleware';
import { UserRole } from '../types/auth.types';
import { loggerInstance as logger } from '../utils/logger';

// Initialize router with security defaults
const router = Router();

// Configure security headers
router.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  expectCt: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}));

// Initialize SearchController
const searchController = new SearchController();

// Configure rate limits
const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many search requests',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const templateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 template operations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many template operations',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * @route POST /api/v1/search
 * @desc Initiates a new LinkedIn profile search with security controls
 * @access Private - Recruiters and Hiring Managers
 */
router.post('/search',
  authenticate,
  authorize([UserRole.RECRUITER, UserRole.HIRING_MANAGER], ['search:profiles']),
  validateSearchCriteria,
  searchRateLimit,
  async (req, res, next) => {
    try {
      logger.info('Initiating profile search', {
        requestId: req.id,
        userId: (req as any).user?.id,
        action: 'SEARCH_INITIATE',
        resourceType: 'SEARCH'
      });

      return await searchController.initiateSearch(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/search/:searchId
 * @desc Retrieves search results with pagination and caching
 * @access Private - Recruiters and Hiring Managers
 */
router.get('/search/:searchId',
  authenticate,
  authorize([UserRole.RECRUITER, UserRole.HIRING_MANAGER], ['read:search-results']),
  searchRateLimit,
  async (req, res, next) => {
    try {
      logger.info('Retrieving search results', {
        requestId: req.id,
        userId: (req as any).user?.id,
        searchId: req.params.searchId,
        action: 'SEARCH_RETRIEVE',
        resourceType: 'SEARCH'
      });

      // Set cache control headers
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
      return await searchController.getSearchResults(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/search/templates
 * @desc Saves search criteria as a template with security validation
 * @access Private - Recruiters only
 */
router.post('/search/templates',
  authenticate,
  authorize([UserRole.RECRUITER], ['create:search-templates']),
  validateSearchTemplate,
  templateRateLimit,
  async (req, res, next) => {
    try {
      logger.info('Creating search template', {
        requestId: req.id,
        userId: (req as any).user?.id,
        action: 'TEMPLATE_CREATE',
        resourceType: 'TEMPLATE'
      });

      return await searchController.saveSearchTemplate(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/search/templates
 * @desc Retrieves saved search templates with pagination
 * @access Private - Recruiters only
 */
router.get('/search/templates',
  authenticate,
  authorize([UserRole.RECRUITER], ['read:search-templates']),
  templateRateLimit,
  async (req, res, next) => {
    try {
      logger.info('Retrieving search templates', {
        requestId: req.id,
        userId: (req as any).user?.id,
        action: 'TEMPLATE_RETRIEVE',
        resourceType: 'TEMPLATE'
      });

      // Set cache control headers
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
      return await searchController.getSearchTemplates(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Export configured router
export default router;