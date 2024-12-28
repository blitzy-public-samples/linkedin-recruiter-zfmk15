import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { axe } from '@axe-core/react';
import Analytics from './Analytics';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { useWebSocket } from '../../hooks/useWebSocket';

// Mock dependencies
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      id: 'test-user',
      role: 'ADMIN',
      permissions: ['analytics.view']
    }
  })
}));

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn()
}));

// Mock analytics service responses
const mockMetricsData = {
  totalSearches: 1234,
  profilesFound: 12456,
  avgMatchScore: 84,
  screeningTimeReduction: 75,
  candidateMatchAccuracy: 90,
  profilesProcessed: 10000,
  costReduction: 50
};

describe('Analytics Page', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock WebSocket hook
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    });
  });

  // Cleanup after each test
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render loading state while fetching data', async () => {
    renderWithProviders(<Analytics />);

    // Check for loading indicators
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should handle unauthorized access correctly', () => {
    // Mock unauthorized user
    vi.mocked(useAuth).mockReturnValueOnce({
      isAuthenticated: true,
      user: {
        id: 'test-user',
        role: 'BASIC',
        permissions: []
      }
    });

    renderWithProviders(<Analytics />);

    // Check for access denied message
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to view analytics/i)).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    // Mock unauthenticated state
    vi.mocked(useAuth).mockReturnValueOnce({
      isAuthenticated: false,
      user: null
    });

    const { history } = renderWithProviders(<Analytics />);

    // Check for redirect
    expect(history.location.pathname).toBe('/login');
  });

  it('should render analytics dashboard with correct metrics', async () => {
    renderWithProviders(<Analytics />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check for key metrics
    expect(screen.getByText('Total Searches')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Profiles Found')).toBeInTheDocument();
    expect(screen.getByText('12,456')).toBeInTheDocument();
    expect(screen.getByText('Average Match Score')).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
  });

  it('should handle real-time metric updates', async () => {
    // Mock WebSocket subscription
    const mockSubscribe = vi.fn();
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn()
    });

    renderWithProviders(<Analytics />);

    // Verify WebSocket subscription
    expect(mockSubscribe).toHaveBeenCalledWith(
      'analytics.update',
      expect.any(Function),
      expect.any(Object)
    );

    // Simulate WebSocket update
    const updateCallback = mockSubscribe.mock.calls[0][1];
    updateCallback({
      totalSearches: 1500,
      profilesFound: 13000
    });

    // Check for updated metrics
    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('13,000')).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    // Mock error in analytics service
    vi.mocked(useWebSocket).mockImplementationOnce(() => {
      throw new Error('Failed to fetch analytics data');
    });

    renderWithProviders(<Analytics />);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch analytics data/i)).toBeInTheDocument();
    });

    // Verify error boundary fallback
    expect(screen.getByText(/Analytics Error/i)).toBeInTheDocument();
  });

  it('should pass accessibility audit', async () => {
    const { container } = renderWithProviders(<Analytics />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Run accessibility audit
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should cleanup WebSocket subscriptions on unmount', () => {
    const mockUnsubscribe = vi.fn();
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      subscribe: vi.fn(),
      unsubscribe: mockUnsubscribe
    });

    const { unmount } = renderWithProviders(<Analytics />);

    // Unmount component
    unmount();

    // Verify cleanup
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle date range changes', async () => {
    renderWithProviders(<Analytics />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Change date range
    const dateRangeSelect = screen.getByRole('combobox');
    fireEvent.change(dateRangeSelect, { target: { value: 'MONTH' } });

    // Verify loading state and data refresh
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should render charts with correct data', async () => {
    renderWithProviders(<Analytics />);

    // Wait for charts to render
    await waitFor(() => {
      expect(screen.getByTestId('search-performance-chart')).toBeInTheDocument();
      expect(screen.getByTestId('profiles-found-chart')).toBeInTheDocument();
      expect(screen.getByTestId('match-score-chart')).toBeInTheDocument();
    });

    // Verify chart accessibility
    const charts = screen.getAllByRole('img');
    charts.forEach(chart => {
      expect(chart).toHaveAttribute('aria-label');
    });
  });
});