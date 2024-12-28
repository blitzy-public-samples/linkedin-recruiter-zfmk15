import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { axe } from '@axe-core/react';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import AnalyticsCharts from './AnalyticsCharts';

// Mock WebSocket service
vi.mock('../../../services/websocket.service', () => ({
  WebSocketService: {
    getInstance: () => ({
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    })
  }
}));

// Mock search metrics data
const mockSearchMetrics = [
  {
    date: '2023-01-01',
    searchCount: 150,
    profilesFound: 1200,
    averageMatchScore: 85.5
  },
  {
    date: '2023-01-02',
    searchCount: 180,
    profilesFound: 1500,
    averageMatchScore: 87.2
  }
];

// Mock initial Redux state
const mockInitialState = {
  search: {
    metrics: mockSearchMetrics,
    loading: false,
    error: null
  }
};

describe('AnalyticsCharts', () => {
  const mockDateRange = {
    start: new Date('2023-01-01'),
    end: new Date('2023-01-31')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window dimensions for responsive tests
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders all charts correctly with data', () => {
    const { container } = renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      { preloadedState: mockInitialState }
    );

    // Verify chart headings
    expect(screen.getByText('Search Performance')).toBeInTheDocument();
    expect(screen.getByText('Profiles Found')).toBeInTheDocument();
    expect(screen.getByText('Average Match Score')).toBeInTheDocument();

    // Verify chart elements
    const charts = container.querySelectorAll('[role="img"]');
    expect(charts).toHaveLength(3);
  });

  it('handles responsive layouts correctly', async () => {
    const { rerender } = renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      { preloadedState: mockInitialState }
    );

    // Test desktop layout
    expect(screen.getAllByRole('img')).toHaveLength(3);

    // Test tablet layout
    window.innerWidth = 800;
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      const charts = screen.getAllByRole('img');
      expect(charts[0]).toHaveStyle({ height: '320px' });
    });

    // Test mobile layout
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    rerender(<AnalyticsCharts dateRange={mockDateRange} />);
    await waitFor(() => {
      const charts = screen.getAllByRole('img');
      expect(charts[0]).toHaveStyle({ height: '300px' });
    });
  });

  it('displays loading state correctly', () => {
    renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      {
        preloadedState: {
          search: { ...mockInitialState.search, loading: true }
        }
      }
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    const mockError = 'Failed to load analytics data';
    const mockOnError = vi.fn();

    renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} onError={mockOnError} />,
      {
        preloadedState: {
          search: { ...mockInitialState.search, error: mockError }
        }
      }
    );

    expect(screen.getByText(/Failed to load analytics data/)).toBeInTheDocument();
    expect(mockOnError).toHaveBeenCalled();
  });

  it('handles empty data state correctly', () => {
    renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      {
        preloadedState: {
          search: { ...mockInitialState.search, metrics: [] }
        }
      }
    );

    expect(screen.getByText(/No analytics data available/)).toBeInTheDocument();
  });

  it('updates charts when date range changes', async () => {
    const { rerender } = renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      { preloadedState: mockInitialState }
    );

    const newDateRange = {
      start: new Date('2023-02-01'),
      end: new Date('2023-02-28')
    };

    rerender(<AnalyticsCharts dateRange={newDateRange} />);

    await waitFor(() => {
      const charts = screen.getAllByRole('img');
      expect(charts).toHaveLength(3);
    });
  });

  it('handles real-time updates via WebSocket', async () => {
    const { store } = renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      { preloadedState: mockInitialState }
    );

    const newMetric = {
      date: '2023-01-03',
      searchCount: 200,
      profilesFound: 1800,
      averageMatchScore: 88.5
    };

    // Simulate WebSocket update
    store.dispatch({
      type: 'search/updateMetrics',
      payload: [...mockSearchMetrics, newMetric]
    });

    await waitFor(() => {
      const charts = screen.getAllByRole('img');
      expect(charts).toHaveLength(3);
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      { preloadedState: mockInitialState }
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA labels
    const charts = screen.getAllByRole('img');
    expect(charts[0]).toHaveAttribute('aria-label', 'Search performance over time');
    expect(charts[1]).toHaveAttribute('aria-label', 'Number of profiles found per day');
    expect(charts[2]).toHaveAttribute('aria-label', 'Average profile match scores over time');
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      { preloadedState: mockInitialState }
    );

    const charts = screen.getAllByRole('img');
    
    // Verify keyboard focus management
    for (const chart of charts) {
      chart.focus();
      expect(document.activeElement).toBe(chart);
    }
  });

  it('maintains performance with large datasets', async () => {
    // Generate large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toLocaleDateString(),
      searchCount: Math.floor(Math.random() * 1000),
      profilesFound: Math.floor(Math.random() * 5000),
      averageMatchScore: 70 + Math.random() * 30
    }));

    const { container } = renderWithProviders(
      <AnalyticsCharts dateRange={mockDateRange} />,
      {
        preloadedState: {
          search: { ...mockInitialState.search, metrics: largeDataset }
        }
      }
    );

    // Verify charts render efficiently
    await waitFor(() => {
      const charts = container.querySelectorAll('[role="img"]');
      expect(charts).toHaveLength(3);
    });
  });
});