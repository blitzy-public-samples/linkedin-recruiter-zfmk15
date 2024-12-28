/**
 * @file End-to-end tests for LinkedIn profile search functionality
 * @version 1.0.0
 * @description Implements comprehensive testing of search features including
 * form interactions, real-time updates, accessibility, and performance metrics
 */

import { test, expect } from '@playwright/test';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-utils';
import { handlers } from '../mocks/handlers';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

// Test timeouts
const TEST_TIMEOUTS = {
  search: 5000,    // Search operation timeout
  websocket: 2000, // WebSocket connection timeout
  animation: 300   // UI animation duration
} as const;

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  searchResponse: 2000,  // Max search response time (ms)
  renderTime: 100,       // Max component render time (ms)
  memoryLimit: 50        // Max memory usage (MB)
} as const;

// Accessibility test configuration
const ACCESSIBILITY_CONFIG = {
  rules: ['wcag2a', 'wcag2aa'],
  resultTypes: ['violations']
} as const;

// Test data
const TEST_SEARCH_CRITERIA = {
  keywords: 'Senior Software Engineer React Node.js',
  location: 'San Francisco, CA',
  experienceYears: {
    min: 5,
    max: 10
  },
  requiredSkills: ['React', 'Node.js', 'TypeScript'],
  optionalSkills: ['AWS', 'Docker', 'Kubernetes']
};

test.describe('Search Page', () => {
  let page: any;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Setup mock handlers
    await page.route('**/api/v1/**', (route: any) => {
      const handler = handlers.find(h => 
        route.request().url().includes(h.info.path)
      );
      if (handler) {
        return route.fulfill(handler);
      }
      return route.continue();
    });

    // Navigate to search page
    await page.goto('/search');
    
    // Initialize accessibility testing
    await injectAxe(page);
  });

  test('should render search form with all required fields', async () => {
    // Check form structure
    await expect(page.locator('[data-testid="search-form"]')).toBeVisible();
    await expect(page.locator('#keywords')).toBeVisible();
    await expect(page.locator('#location')).toBeVisible();
    await expect(page.locator('[data-testid="experience-range"]')).toBeVisible();
    await expect(page.locator('[data-testid="required-skills"]')).toBeVisible();
    await expect(page.locator('[data-testid="optional-skills"]')).toBeVisible();
  });

  test('should validate search form inputs', async () => {
    // Submit empty form
    await page.click('[data-testid="search-submit"]');
    
    // Check validation messages
    await expect(page.locator('#keywords-error')).toBeVisible();
    await expect(page.locator('#keywords-error')).toHaveText('Keywords are required');
    
    // Fill invalid experience range
    await page.fill('[data-testid="experience-min"]', '10');
    await page.fill('[data-testid="experience-max"]', '5');
    
    // Check range validation
    await expect(page.locator('#experience-error')).toBeVisible();
    await expect(page.locator('#experience-error')).toHaveText('Invalid experience range');
  });

  test('should execute search and display real-time updates', async () => {
    // Fill search form
    await page.fill('#keywords', TEST_SEARCH_CRITERIA.keywords);
    await page.fill('#location', TEST_SEARCH_CRITERIA.location);
    
    // Add required skills
    for (const skill of TEST_SEARCH_CRITERIA.requiredSkills) {
      await page.click('[data-testid="add-required-skill"]');
      await page.fill('[data-testid="skill-input"]', skill);
      await page.click('[data-testid="confirm-skill"]');
    }

    // Start performance measurement
    const startTime = Date.now();
    
    // Execute search
    await page.click('[data-testid="search-submit"]');
    
    // Check search status updates
    await expect(page.locator('[data-testid="search-status"]'))
      .toHaveText('Searching...');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]'))
      .toBeVisible({ timeout: TEST_TIMEOUTS.search });
    
    // Verify performance
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponse);
  });

  test('should handle WebSocket real-time updates', async () => {
    // Setup WebSocket connection
    await page.evaluate(() => {
      window.WebSocket = class MockWebSocket {
        onmessage: ((event: MessageEvent) => void) | null = null;
        send(data: string) {}
        close() {}
      };
    });

    // Execute search
    await page.fill('#keywords', TEST_SEARCH_CRITERIA.keywords);
    await page.click('[data-testid="search-submit"]');

    // Simulate profile found event
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      ws.onmessage?.({
        data: JSON.stringify({
          event: 'profile.found',
          data: {
            profile: {
              id: 'test-profile',
              name: 'John Developer',
              matchScore: 0.95
            }
          }
        })
      });
    });

    // Verify real-time update
    await expect(page.locator('[data-testid="profile-card-test-profile"]'))
      .toBeVisible({ timeout: TEST_TIMEOUTS.websocket });
  });

  test('should meet accessibility requirements', async () => {
    // Run accessibility scan
    const violations = await checkA11y(page, null, ACCESSIBILITY_CONFIG);
    expect(violations).toHaveLength(0);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('#keywords')).toBeFocused();
    
    // Check ARIA attributes
    await expect(page.locator('[data-testid="search-form"]'))
      .toHaveAttribute('role', 'search');
    await expect(page.locator('[data-testid="search-results"]'))
      .toHaveAttribute('aria-live', 'polite');
  });

  test('should handle search template management', async () => {
    // Save search template
    await page.fill('#keywords', TEST_SEARCH_CRITERIA.keywords);
    await page.click('[data-testid="save-template"]');
    await page.fill('[data-testid="template-name"]', 'Test Template');
    await page.click('[data-testid="confirm-save-template"]');

    // Verify template saved
    await expect(page.locator('[data-testid="template-list"]'))
      .toContainText('Test Template');

    // Load template
    await page.click('[data-testid="load-template-Test Template"]');
    await expect(page.locator('#keywords'))
      .toHaveValue(TEST_SEARCH_CRITERIA.keywords);
  });

  test('should monitor search performance metrics', async () => {
    // Start performance monitoring
    const performanceEntries: PerformanceEntry[] = [];
    await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        performanceEntries.push(...list.getEntries());
      });
      observer.observe({ entryTypes: ['measure'] });
    });

    // Execute search
    await page.fill('#keywords', TEST_SEARCH_CRITERIA.keywords);
    await page.click('[data-testid="search-submit"]');

    // Wait for results
    await expect(page.locator('[data-testid="search-results"]'))
      .toBeVisible({ timeout: TEST_TIMEOUTS.search });

    // Check performance metrics
    const metrics = await page.evaluate(() => ({
      memory: performance.memory?.usedJSHeapSize / 1024 / 1024,
      timing: performance.getEntriesByType('measure')
    }));

    expect(metrics.memory).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
    expect(metrics.timing[0].duration).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime);
  });
});