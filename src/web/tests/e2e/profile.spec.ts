/**
 * @file End-to-end tests for LinkedIn profile viewing and analysis functionality
 * @version 1.0.0
 * @description Implements comprehensive testing of profile display, analysis,
 * accessibility compliance, and responsive design using Playwright
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupMSW, mockWebSocket } from '@playwright-testing-library/msw';
import { handlers } from '../mocks/handlers';
import { renderWithProviders } from '../utils/test-utils';
import { AxeBuilder } from '@axe-core/playwright';

// Test constants
const TEST_PROFILE_ID = 'profile-1';

// Viewport sizes for responsive testing
const VIEWPORT_SIZES = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

// Performance thresholds in milliseconds
const PERFORMANCE_THRESHOLDS = {
  profileLoad: 2000,
  analysisLoad: 5000,
  updateLatency: 500
};

// Mock profile data matching API response shape
const MOCK_PROFILE_DATA = {
  id: TEST_PROFILE_ID,
  fullName: 'John Developer',
  currentRole: 'Senior Software Engineer',
  location: 'San Francisco, CA',
  matchScore: 92,
  skills: ['JavaScript', 'React', 'Node.js'],
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      duration: '2020-present'
    }
  ],
  education: [
    {
      degree: 'BS Computer Science',
      institution: 'Tech University',
      year: '2015'
    }
  ]
};

test.describe('Profile Page', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Create new context for each test
    context = await browser.newContext({
      viewport: VIEWPORT_SIZES.desktop
    });
    page = await context.newPage();

    // Setup MSW handlers
    await setupMSW(page, handlers);

    // Setup WebSocket mock
    await mockWebSocket(page, {
      url: 'ws://localhost/ws',
      handlers: {
        'profile.update': (data) => {
          return {
            type: 'profile.update',
            data: {
              profileId: TEST_PROFILE_ID,
              updates: data
            }
          };
        }
      }
    });

    // Navigate to profile page
    await page.goto(`/profiles/${TEST_PROFILE_ID}`);
  });

  test('should display profile details with real-time updates', async () => {
    // Wait for initial profile load
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="profile-header"]');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.profileLoad);

    // Verify profile header information
    const header = await page.locator('[data-testid="profile-header"]');
    await expect(header.locator('[data-testid="profile-name"]'))
      .toHaveText(MOCK_PROFILE_DATA.fullName);
    await expect(header.locator('[data-testid="profile-role"]'))
      .toHaveText(MOCK_PROFILE_DATA.currentRole);
    await expect(header.locator('[data-testid="match-score"]'))
      .toContainText(MOCK_PROFILE_DATA.matchScore.toString());

    // Verify experience section
    const experience = await page.locator('[data-testid="experience-section"]');
    await expect(experience).toBeVisible();
    await expect(experience.locator('.experience-item')).toHaveCount(
      MOCK_PROFILE_DATA.experience.length
    );

    // Test real-time updates
    await page.evaluate(() => {
      // Simulate WebSocket message
      window.postMessage({
        type: 'profile.update',
        data: {
          profileId: 'profile-1',
          updates: {
            currentRole: 'Lead Software Engineer'
          }
        }
      }, '*');
    });

    // Verify update notification
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(header.locator('[data-testid="profile-role"]'))
      .toHaveText('Lead Software Engineer');
  });

  test('should handle analysis with performance metrics', async () => {
    // Request analysis
    const analysisButton = await page.locator('[data-testid="analyze-profile"]');
    await analysisButton.click();

    // Measure analysis load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="analysis-results"]');
    const analysisTime = Date.now() - startTime;
    expect(analysisTime).toBeLessThan(PERFORMANCE_THRESHOLDS.analysisLoad);

    // Verify analysis results
    const analysis = await page.locator('[data-testid="analysis-results"]');
    await expect(analysis.locator('[data-testid="skill-match"]')).toBeVisible();
    await expect(analysis.locator('[data-testid="experience-score"]')).toBeVisible();

    // Test error state
    await page.route('**/api/v1/profiles/*/analysis', (route) => {
      route.fulfill({ status: 500 });
    });
    await analysisButton.click();
    await expect(page.locator('[role="alert"]')).toContainText('Analysis failed');

    // Verify retry mechanism
    await expect(analysisButton).toBeEnabled();
    await analysisButton.click();
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
  });

  test('should validate accessibility compliance', async () => {
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="profile-container"]')
      .analyze();

    expect(accessibilityScanResults.violations).toHaveLength(0);

    // Check ARIA attributes
    await expect(page.locator('[data-testid="profile-header"]'))
      .toHaveAttribute('role', 'banner');
    await expect(page.locator('[data-testid="match-score"]'))
      .toHaveAttribute('aria-label', /Match score:/);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy();

    // Test responsive layout
    for (const [size, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport);
      await expect(page.locator('[data-testid="profile-container"]'))
        .toHaveCSS('display', 'flex');
    }
  });

  test('should handle loading and error states', async () => {
    // Test loading state
    await page.route('**/api/v1/profiles/*', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify(MOCK_PROFILE_DATA) });
    }, { times: 1 });

    await page.reload();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-header"]')).toBeVisible();

    // Test error state
    await page.route('**/api/v1/profiles/*', (route) => {
      route.fulfill({ status: 404 });
    });

    await page.reload();
    await expect(page.locator('[role="alert"]'))
      .toContainText('Profile not found');
    await expect(page.locator('[data-testid="error-retry-button"]'))
      .toBeVisible();
  });
});