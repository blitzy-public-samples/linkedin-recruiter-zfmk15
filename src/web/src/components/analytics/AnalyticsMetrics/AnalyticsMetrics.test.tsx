import React from 'react'; // v18.0.0
import { screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import { describe, it, expect, beforeEach, jest } from '@jest/globals'; // v29.0.0
import { toHaveNoViolations } from 'jest-axe'; // v8.0.0
import { toBeInTheDocument, toHaveStyle } from '@testing-library/jest-dom'; // v5.16.0
import { renderWithProviders } from '../../../tests/utils/test-utils';
import AnalyticsMetrics from './AnalyticsMetrics';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockMetricsData = {
  totalSearches: 1234,
  profilesFound: 12456,
  averageMatchScore: 84,
  timeRange: 'week',
  trendData: [
    { date: '2023-01-01', searches: 100, profiles: 1000, score: 85 },
    { date: '2023-01-02', searches: 150, profiles: 1500, score: 83 },
    { date: '2023-01-03', searches: 200, profiles: 2000, score: 86 }
  ]
};

// Test IDs for component elements
const testIds = {
  totalSearchesCard: 'metrics-total-searches',
  profilesFoundCard: 'metrics-profiles-found',
  matchScoreCard: 'metrics-match-score',
  loadingSkeleton: 'metrics-loading',
  errorDisplay: 'metrics-error'
};

describe('AnalyticsMetrics Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all metric cards with correct data', async () => {
    const { container } = renderWithProviders(
      <AnalyticsMetrics
        totalSearches={mockMetricsData.totalSearches}
        profilesFound={mockMetricsData.profilesFound}
        averageMatchScore={mockMetricsData.averageMatchScore}
        timeRange={mockMetricsData.timeRange}
        trendData={mockMetricsData.trendData}
      />
    );

    // Verify total searches card
    const totalSearchesCard = screen.getByRole('region', { name: /total searches metric card/i });
    expect(totalSearchesCard).toBeInTheDocument();
    expect(within(totalSearchesCard).getByText('1,234')).toBeInTheDocument();

    // Verify profiles found card
    const profilesFoundCard = screen.getByRole('region', { name: /profiles found metric card/i });
    expect(profilesFoundCard).toBeInTheDocument();
    expect(within(profilesFoundCard).getByText('12,456')).toBeInTheDocument();

    // Verify match score card
    const matchScoreCard = screen.getByRole('region', { name: /average match score metric card/i });
    expect(matchScoreCard).toBeInTheDocument();
    expect(within(matchScoreCard).getByText('84.0%')).toBeInTheDocument();

    // Verify trend charts are rendered
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(3);
  });

  it('handles loading state correctly', () => {
    renderWithProviders(
      <AnalyticsMetrics
        totalSearches={0}
        profilesFound={0}
        averageMatchScore={0}
        timeRange="week"
        trendData={[]}
        isLoading={true}
      />
    );

    // Verify loading skeletons are displayed
    const skeletons = screen.getAllByRole('progressbar');
    expect(skeletons).toHaveLength(3);
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveStyle({ borderRadius: '8px' });
    });
  });

  it('maintains accessibility standards', async () => {
    const { container } = renderWithProviders(
      <AnalyticsMetrics
        totalSearches={mockMetricsData.totalSearches}
        profilesFound={mockMetricsData.profilesFound}
        averageMatchScore={mockMetricsData.averageMatchScore}
        timeRange={mockMetricsData.timeRange}
        trendData={mockMetricsData.trendData}
      />
    );

    // Check ARIA roles and labels
    expect(screen.getAllByRole('region')).toHaveLength(3);
    expect(screen.getAllByRole('img')).toHaveLength(3); // Charts have img role

    // Verify tooltips are accessible
    const cards = screen.getAllByRole('region');
    cards.forEach(card => {
      expect(card).toHaveAttribute('aria-label');
    });

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles errors gracefully', async () => {
    const onError = jest.fn();
    
    renderWithProviders(
      <AnalyticsMetrics
        totalSearches={mockMetricsData.totalSearches}
        profilesFound={mockMetricsData.profilesFound}
        averageMatchScore={mockMetricsData.averageMatchScore}
        timeRange={mockMetricsData.timeRange}
        trendData={mockMetricsData.trendData}
        onError={onError}
      />
    );

    // Simulate chart error
    const error = new Error('Chart rendering failed');
    const chart = screen.getAllByRole('img')[0];
    fireEvent.error(chart, { error });

    // Verify error handling
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('updates metrics when props change', async () => {
    const { rerender } = renderWithProviders(
      <AnalyticsMetrics
        totalSearches={1000}
        profilesFound={10000}
        averageMatchScore={80}
        timeRange="week"
        trendData={mockMetricsData.trendData}
      />
    );

    // Initial render verification
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();

    // Update props
    rerender(
      <AnalyticsMetrics
        totalSearches={2000}
        profilesFound={20000}
        averageMatchScore={90}
        timeRange="week"
        trendData={mockMetricsData.trendData}
      />
    );

    // Verify updates
    await waitFor(() => {
      expect(screen.getByText('2,000')).toBeInTheDocument();
      expect(screen.getByText('20,000')).toBeInTheDocument();
      expect(screen.getByText('90.0%')).toBeInTheDocument();
    });
  });

  it('handles responsive layout correctly', () => {
    const { container } = renderWithProviders(
      <AnalyticsMetrics
        totalSearches={mockMetricsData.totalSearches}
        profilesFound={mockMetricsData.profilesFound}
        averageMatchScore={mockMetricsData.averageMatchScore}
        timeRange={mockMetricsData.timeRange}
        trendData={mockMetricsData.trendData}
      />
    );

    // Verify grid layout
    const gridContainer = container.querySelector('.MuiGrid-container');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveStyle({ margin: '-12px' });

    // Verify responsive grid items
    const gridItems = container.querySelectorAll('.MuiGrid-item');
    gridItems.forEach(item => {
      expect(item).toHaveStyle({ padding: '12px' });
    });
  });

  it('formats metric values correctly', () => {
    renderWithProviders(
      <AnalyticsMetrics
        totalSearches={1234567}
        profilesFound={9876543}
        averageMatchScore={99.9}
        timeRange="week"
        trendData={mockMetricsData.trendData}
      />
    );

    // Verify number formatting
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('9,876,543')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });

  it('displays correct tooltips for metrics', async () => {
    renderWithProviders(
      <AnalyticsMetrics
        totalSearches={mockMetricsData.totalSearches}
        profilesFound={mockMetricsData.profilesFound}
        averageMatchScore={mockMetricsData.averageMatchScore}
        timeRange="week"
        trendData={mockMetricsData.trendData}
      />
    );

    // Hover over metric cards and verify tooltips
    const cards = screen.getAllByRole('region');
    
    for (const card of cards) {
      fireEvent.mouseOver(card);
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(/in the last week/i);
      });
      fireEvent.mouseOut(card);
    }
  });
});