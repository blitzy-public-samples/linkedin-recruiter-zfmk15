import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import { axe } from '@axe-core/react';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock analytics data for testing
const mockAnalyticsData = {
  metrics: {
    totalSearches: 1234,
    profilesFound: 12456,
    averageMatchScore: 84,
    screeningTimeReduction: 75,
    candidateMatchAccuracy: 90
  },
  charts: {
    daily: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString(),
      searches: Math.floor(Math.random() * 100),
      profiles: Math.floor(Math.random() * 50),
      score: 75 + Math.floor(Math.random() * 20)
    })),
    weekly: [],
    monthly: []
  }
};

// Mock WebSocket connection
vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  })
}));

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    // Reset all mocks and handlers
    vi.clearAllMocks();
    
    // Mock Redux initial state
    const initialState = {
      search: {
        metrics: mockAnalyticsData.metrics,
        loading: false,
        error: null
      }
    };

    // Mock window resize observer
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render loading state correctly', () => {
    const { container } = renderWithProviders(<AnalyticsDashboard />, {
      preloadedState: {
        search: { loading: true }
      }
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render analytics metrics and charts when data is available', async () => {
    const { container } = renderWithProviders(<AnalyticsDashboard />);

    // Verify metrics are displayed
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument(); // Total searches
      expect(screen.getByText('12,456')).toBeInTheDocument(); // Profiles found
      expect(screen.getByText('84%')).toBeInTheDocument(); // Average match score
    });

    // Verify charts are rendered
    expect(screen.getByRole('img', { name: /search performance/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /profiles found/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /match scores/i })).toBeInTheDocument();

    // Snapshot test
    expect(container).toMatchSnapshot();
  });

  it('should handle time range selection', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    // Find and click time range selector
    const timeRangeSelect = screen.getByRole('combobox');
    await userEvent.click(timeRangeSelect);

    // Select monthly view
    const monthlyOption = screen.getByRole('option', { name: /last month/i });
    await userEvent.click(monthlyOption);

    // Verify data updates
    await waitFor(() => {
      expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    });
  });

  it('should handle real-time metric updates', async () => {
    const { container } = renderWithProviders(<AnalyticsDashboard />);

    // Simulate WebSocket update
    const mockUpdate = {
      totalSearches: 1235,
      profilesFound: 12457,
      averageMatchScore: 85
    };

    // Trigger update through Redux
    await waitFor(() => {
      expect(screen.getByText('1,235')).toBeInTheDocument();
      expect(screen.getByText('12,457')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    renderWithProviders(<AnalyticsDashboard />, {
      preloadedState: {
        search: {
          error: 'Failed to load analytics data'
        }
      }
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load analytics data');
  });

  it('should be responsive across breakpoints', async () => {
    const { container } = renderWithProviders(<AnalyticsDashboard />);

    // Test mobile viewport
    global.innerWidth = 375;
    fireEvent(window, new Event('resize'));
    await waitFor(() => {
      expect(container.querySelector('.mobile-layout')).toBeInTheDocument();
    });

    // Test desktop viewport
    global.innerWidth = 1440;
    fireEvent(window, new Event('resize'));
    await waitFor(() => {
      expect(container.querySelector('.desktop-layout')).toBeInTheDocument();
    });
  });

  it('should meet accessibility requirements', async () => {
    const { container } = renderWithProviders(<AnalyticsDashboard />);

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA labels
    expect(screen.getByLabelText(/analytics dashboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time range selector/i)).toBeInTheDocument();
  });

  it('should handle data export functionality', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportButton);

    // Verify export dialog appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/export analytics data/i)).toBeInTheDocument();
  });

  it('should maintain state during component updates', async () => {
    const { rerender } = renderWithProviders(<AnalyticsDashboard />);

    // Select a time range
    const timeRangeSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(timeRangeSelect, 'WEEK');

    // Rerender component
    rerender(<AnalyticsDashboard />);

    // Verify time range selection persists
    expect(timeRangeSelect).toHaveValue('WEEK');
  });
});