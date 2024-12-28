/**
 * @file End-to-end test suite for Analytics Dashboard
 * @version 1.0.0
 * @description Comprehensive testing of analytics dashboard functionality including
 * metrics display, real-time updates, accessibility, and responsive design
 */

import { 
  screen, 
  within, 
  waitFor, 
  fireEvent 
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { axe } from '@axe-core/react';
import { renderWithProviders } from '../utils/test-utils';
import mockResizeObserver from 'resize-observer-polyfill';
import mockWebSocket from 'jest-websocket-mock';

// Mock WebSocket server for real-time updates testing
const WS_URL = 'ws://localhost:1234';
let mockWebSocketServer: mockWebSocket.WS;

// Mock analytics data based on technical specifications
const mockAnalyticsData = {
  totalSearches: 1234,
  profilesFound: 12456,
  avgMatchScore: 84,
  screeningTimeReduction: 75,
  matchAccuracy: 90,
  profilesProcessedDaily: 10000,
  searchPerformance: [
    { date: '2023-01-01', searches: 100 },
    { date: '2023-01-02', searches: 150 },
    { date: '2023-01-03', searches: 200 }
  ],
  topSearchTerms: [
    { term: 'Python Developer', count: 234 },
    { term: 'AWS Engineer', count: 189 },
    { term: 'Full Stack', count: 156 }
  ]
};

/**
 * Helper function to setup analytics dashboard with test data
 */
const setupAnalyticsDashboard = async (
  preloadedState = {},
  mockWebSocketInstance?: mockWebSocket.WS
) => {
  // Setup ResizeObserver mock
  global.ResizeObserver = mockResizeObserver;

  // Initialize WebSocket mock if not provided
  if (!mockWebSocketInstance) {
    mockWebSocketInstance = new mockWebSocket(WS_URL);
  }

  const rendered = renderWithProviders(
    <AnalyticsDashboard />,
    {
      preloadedState: {
        analytics: {
          data: mockAnalyticsData,
          loading: false,
          error: null,
          ...preloadedState
        }
      }
    }
  );

  // Wait for initial render
  await waitFor(() => {
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
  });

  return {
    ...rendered,
    mockWebSocket: mockWebSocketInstance,
    cleanup: () => {
      mockWebSocketInstance?.close();
      rendered.cleanup();
    }
  };
};

/**
 * Helper function to simulate screen resize
 */
const simulateResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width });
  Object.defineProperty(window, 'innerHeight', { value: height });
  window.dispatchEvent(new Event('resize'));
};

describe('Analytics Dashboard E2E Tests', () => {
  beforeEach(() => {
    mockWebSocketServer = new mockWebSocket(WS_URL);
  });

  describe('Key Metrics Display', () => {
    it('should display all required KPI metrics accurately', async () => {
      const { getByTestId } = await setupAnalyticsDashboard();

      // Verify total searches
      expect(getByTestId('metric-total-searches')).toHaveTextContent('1,234');

      // Verify profiles found
      expect(getByTestId('metric-profiles-found')).toHaveTextContent('12,456');

      // Verify average match score
      expect(getByTestId('metric-avg-match')).toHaveTextContent('84%');

      // Verify screening time reduction
      expect(getByTestId('metric-screening-reduction')).toHaveTextContent('75%');

      // Verify match accuracy
      expect(getByTestId('metric-match-accuracy')).toHaveTextContent('90%');

      // Verify daily profile processing
      expect(getByTestId('metric-daily-profiles')).toHaveTextContent('10,000');
    });

    it('should update metrics with animations when values change', async () => {
      const { mockWebSocket } = await setupAnalyticsDashboard();

      // Simulate real-time metric update
      mockWebSocket.send(JSON.stringify({
        event: 'metrics.update',
        data: { totalSearches: 1235 }
      }));

      // Verify animation class is applied
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-searches'))
          .toHaveClass('metric-update-animation');
      });

      // Verify new value is displayed after animation
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-searches'))
          .toHaveTextContent('1,235');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket connection and updates correctly', async () => {
      const { mockWebSocket } = await setupAnalyticsDashboard();

      // Verify WebSocket connection
      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);

      // Simulate metric updates
      mockWebSocket.send(JSON.stringify({
        event: 'metrics.update',
        data: { profilesFound: 12457 }
      }));

      // Verify update is reflected
      await waitFor(() => {
        expect(screen.getByTestId('metric-profiles-found'))
          .toHaveTextContent('12,457');
      });
    });

    it('should handle WebSocket reconnection gracefully', async () => {
      const { mockWebSocket } = await setupAnalyticsDashboard();

      // Simulate connection drop
      mockWebSocket.close();

      // Verify reconnection attempt
      await waitFor(() => {
        expect(screen.getByTestId('connection-status'))
          .toHaveTextContent('Reconnecting...');
      });

      // Simulate successful reconnection
      const newWebSocket = new mockWebSocket(WS_URL);

      // Verify connection restored
      await waitFor(() => {
        expect(screen.getByTestId('connection-status'))
          .toHaveTextContent('Connected');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', async () => {
      await setupAnalyticsDashboard();
      simulateResize(375, 667);

      // Verify mobile layout
      await waitFor(() => {
        expect(screen.getByTestId('analytics-dashboard'))
          .toHaveClass('mobile-layout');
      });

      // Verify stacked metric cards
      const metricCards = screen.getAllByTestId(/^metric-/);
      metricCards.forEach(card => {
        expect(card).toHaveStyle({ width: '100%' });
      });
    });

    it('should adapt layout for tablet screens', async () => {
      await setupAnalyticsDashboard();
      simulateResize(768, 1024);

      // Verify tablet layout
      await waitFor(() => {
        expect(screen.getByTestId('analytics-dashboard'))
          .toHaveClass('tablet-layout');
      });

      // Verify 2-column metric grid
      const metricGrid = screen.getByTestId('metrics-grid');
      expect(metricGrid).toHaveStyle({ 
        gridTemplateColumns: 'repeat(2, 1fr)' 
      });
    });

    it('should adapt layout for desktop screens', async () => {
      await setupAnalyticsDashboard();
      simulateResize(1440, 900);

      // Verify desktop layout
      await waitFor(() => {
        expect(screen.getByTestId('analytics-dashboard'))
          .toHaveClass('desktop-layout');
      });

      // Verify 3-column metric grid
      const metricGrid = screen.getByTestId('metrics-grid');
      expect(metricGrid).toHaveStyle({ 
        gridTemplateColumns: 'repeat(3, 1fr)' 
      });
    });
  });

  describe('Accessibility', () => {
    it('should meet WCAG 2.1 AA standards', async () => {
      const { container } = await setupAnalyticsDashboard();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      await setupAnalyticsDashboard();
      const user = userEvent.setup();

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByTestId('date-range-selector')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('export-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('refresh-button')).toHaveFocus();
    });

    it('should have proper ARIA labels and roles', async () => {
      await setupAnalyticsDashboard();

      // Verify chart accessibility
      const chart = screen.getByTestId('performance-chart');
      expect(chart).toHaveAttribute('role', 'img');
      expect(chart).toHaveAttribute('aria-label');

      // Verify live regions
      expect(screen.getByTestId('metrics-live-region'))
        .toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('should render initial dashboard within performance budget', async () => {
      const startTime = performance.now();
      await setupAnalyticsDashboard();
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(1000); // 1 second budget
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        ...mockAnalyticsData,
        searchPerformance: Array(365).fill(null).map((_, i) => ({
          date: new Date(2023, 0, i + 1).toISOString(),
          searches: Math.random() * 1000
        }))
      };

      const startTime = performance.now();
      await setupAnalyticsDashboard({ data: largeDataset });
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(2000); // 2 second budget for large dataset
    });

    it('should maintain smooth updates during real-time changes', async () => {
      const { mockWebSocket } = await setupAnalyticsDashboard();
      const updateCount = 50;
      const updateInterval = 100; // ms

      // Measure frame rate during rapid updates
      const frameRates: number[] = [];
      let lastTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        mockWebSocket.send(JSON.stringify({
          event: 'metrics.update',
          data: { totalSearches: 1234 + i }
        }));

        const currentTime = performance.now();
        frameRates.push(1000 / (currentTime - lastTime));
        lastTime = currentTime;

        await new Promise(resolve => setTimeout(resolve, updateInterval));
      }

      // Verify minimum frame rate maintained
      const avgFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
      expect(avgFrameRate).toBeGreaterThan(30); // Minimum 30 FPS
    });
  });
});