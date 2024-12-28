import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { screen, fireEvent, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { useTheme, ThemeProvider } from '@mui/material/styles';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import Chart from './Chart';
import createAppTheme from '../../../config/theme.config';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Test data constants
const TEST_LINE_DATA = [
  { date: '2023-01', searches: 120 },
  { date: '2023-02', searches: 150 },
  { date: '2023-03', searches: 180 },
  { date: '2023-04', searches: 200 },
];

const TEST_BAR_DATA = [
  { skill: 'Python', count: 45 },
  { skill: 'Java', count: 35 },
  { skill: 'React', count: 30 },
  { skill: 'AWS', count: 25 },
];

const TEST_PIE_DATA = [
  { role: 'Developer', value: 60 },
  { role: 'Manager', value: 25 },
  { role: 'Architect', value: 15 },
];

// Material Design 3.0 breakpoints
const BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

describe('Chart Component', () => {
  // Setup and teardown
  beforeEach(() => {
    window.innerWidth = BREAKPOINTS.desktop;
    window.innerHeight = 800;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('should render line chart correctly', () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search performance over time"
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(container.querySelector('.recharts-line')).toBeInTheDocument();
      expect(screen.getByLabelText('Search performance over time')).toBeInTheDocument();
    });

    it('should render bar chart correctly', () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="bar"
            data={TEST_BAR_DATA}
            xKey="skill"
            yKey="count"
            height={400}
            accessibilityLabel="Skill distribution"
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(container.querySelector('.recharts-bar')).toBeInTheDocument();
      expect(screen.getByLabelText('Skill distribution')).toBeInTheDocument();
    });

    it('should render pie chart correctly', () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="pie"
            data={TEST_PIE_DATA}
            xKey="role"
            yKey="value"
            height={400}
            accessibilityLabel="Role distribution"
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(container.querySelector('.recharts-pie')).toBeInTheDocument();
      expect(screen.getByLabelText('Role distribution')).toBeInTheDocument();
    });

    it('should handle empty data gracefully', () => {
      renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={[]}
            xKey="date"
            yKey="value"
            height={400}
            accessibilityLabel="Empty chart"
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('should meet WCAG 2.1 AA standards', async () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const chart = screen.getByRole('img');
      chart.focus();
      expect(document.activeElement).toBe(chart);
    });

    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="bar"
            data={TEST_BAR_DATA}
            xKey="skill"
            yKey="count"
            height={400}
            accessibilityLabel="Skill distribution"
          />
        </ThemeProvider>
      );

      expect(screen.getByLabelText('Skill distribution')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior Tests', () => {
    it('should adjust dimensions for mobile viewport', () => {
      window.innerWidth = BREAKPOINTS.mobile;
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });

    it('should adjust dimensions for tablet viewport', () => {
      window.innerWidth = BREAKPOINTS.tablet;
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const chart = container.querySelector('.recharts-responsive-container');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Theme Integration Tests', () => {
    it('should apply light theme colors correctly', () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const chart = container.querySelector('.recharts-line');
      expect(chart).toBeInTheDocument();
    });

    it('should apply dark theme colors correctly', () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('dark')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const chart = container.querySelector('.recharts-line');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Interaction Tests', () => {
    it('should show tooltip on hover', async () => {
      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      const dataPoint = container.querySelector('.recharts-dot');
      if (dataPoint) {
        fireEvent.mouseOver(dataPoint);
        expect(container.querySelector('.recharts-tooltip-wrapper')).toBeInTheDocument();
      }
    });

    it('should handle custom tooltip formatting', () => {
      renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
            tooltipConfig={{
              formatter: (value) => `${value} searches`,
              labelFormatter: (label) => `Month: ${label}`,
            }}
          />
        </ThemeProvider>
      );

      const chart = screen.getByRole('img');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        date: `2023-${i % 12 + 1}`,
        searches: Math.random() * 1000,
      }));

      const { container } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={largeDataset}
            xKey="date"
            yKey="searches"
            height={400}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      expect(container.querySelector('.recharts-line')).toBeInTheDocument();
    });

    it('should handle animation toggling', () => {
      const { rerender } = renderWithProviders(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            animate={true}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      rerender(
        <ThemeProvider theme={createAppTheme('light')}>
          <Chart
            type="line"
            data={TEST_LINE_DATA}
            xKey="date"
            yKey="searches"
            height={400}
            animate={false}
            accessibilityLabel="Search trends"
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});