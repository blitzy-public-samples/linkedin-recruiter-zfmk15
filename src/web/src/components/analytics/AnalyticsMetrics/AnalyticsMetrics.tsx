import React, { useMemo } from 'react'; // v18.0.0
import { Grid, Typography, Box, Skeleton, Tooltip } from '@mui/material'; // v5.14.0
import { useTheme } from '@mui/material/styles'; // v5.14.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0

import Card from '../../common/Card/Card';
import Chart from '../../common/Chart/Chart';
import { AnalysisResult } from '../../../types/analysis.types';

// Interface for trend data points
interface TrendDataPoint {
  date: string;
  searches: number;
  profiles: number;
  score: number;
}

// Props interface with comprehensive configuration
interface AnalyticsMetricsProps {
  totalSearches: number;
  profilesFound: number;
  averageMatchScore: number;
  timeRange: 'day' | 'week' | 'month' | 'year';
  trendData: TrendDataPoint[];
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

// Fallback component for error states
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        padding: theme.spacing(2),
        color: theme.palette.error.main,
        textAlign: 'center'
      }}
    >
      <Typography variant="h6">Error Loading Metrics</Typography>
      <Typography variant="body2">{error.message}</Typography>
    </Box>
  );
};

// Format metric values with proper units and localization
const formatMetricValue = (value: number, type: 'number' | 'percentage'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: type === 'percentage' ? 1 : 0,
    minimumFractionDigits: type === 'percentage' ? 1 : 0,
    style: type === 'percentage' ? 'percent' : 'decimal'
  });

  return type === 'percentage' 
    ? formatter.format(value / 100)
    : formatter.format(value);
};

// Main analytics metrics component
export const AnalyticsMetrics: React.FC<AnalyticsMetricsProps> = React.memo(({
  totalSearches,
  profilesFound,
  averageMatchScore,
  timeRange,
  trendData,
  isLoading = false,
  onError
}) => {
  const theme = useTheme();

  // Memoized chart configurations
  const chartConfigs = useMemo(() => ({
    height: 200,
    tooltipConfig: {
      formatter: (value: number) => formatMetricValue(value, 'number')
    }
  }), []);

  // Loading skeleton for metrics
  const MetricSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      <Skeleton variant="rectangular" height={100} sx={{ borderRadius: theme.shape.borderRadius }} />
    </Box>
  );

  // Render metric card with proper accessibility
  const renderMetricCard = (
    title: string,
    value: number | string,
    trend: React.ReactNode,
    tooltipText: string
  ) => (
    <Tooltip title={tooltipText} arrow placement="top">
      <Card
        variant="elevated"
        elevation={1}
        role="region"
        ariaLabel={`${title} metric card`}
      >
        <Box sx={{ p: theme.spacing(2) }}>
          <Typography
            variant="subtitle2"
            color="textSecondary"
            gutterBottom
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            component="div"
            sx={{ mb: 2, fontWeight: 500 }}
          >
            {value}
          </Typography>
          {trend}
        </Box>
      </Card>
    </Tooltip>
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={onError}
    >
      <Grid container spacing={3}>
        {/* Total Searches Metric */}
        <Grid item xs={12} sm={6} md={4}>
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            renderMetricCard(
              'Total Searches',
              formatMetricValue(totalSearches, 'number'),
              <Chart
                type="line"
                data={trendData}
                xKey="date"
                yKey="searches"
                height={chartConfigs.height}
                tooltipConfig={chartConfigs.tooltipConfig}
                accessibilityLabel="Search trend chart"
              />,
              `Total searches performed in the last ${timeRange}`
            )
          )}
        </Grid>

        {/* Profiles Found Metric */}
        <Grid item xs={12} sm={6} md={4}>
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            renderMetricCard(
              'Profiles Found',
              formatMetricValue(profilesFound, 'number'),
              <Chart
                type="line"
                data={trendData}
                xKey="date"
                yKey="profiles"
                height={chartConfigs.height}
                tooltipConfig={chartConfigs.tooltipConfig}
                accessibilityLabel="Profiles found trend chart"
              />,
              `Total profiles discovered in the last ${timeRange}`
            )
          )}
        </Grid>

        {/* Average Match Score Metric */}
        <Grid item xs={12} sm={6} md={4}>
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            renderMetricCard(
              'Average Match Score',
              formatMetricValue(averageMatchScore, 'percentage'),
              <Chart
                type="line"
                data={trendData}
                xKey="date"
                yKey="score"
                height={chartConfigs.height}
                tooltipConfig={{
                  formatter: (value: number) => formatMetricValue(value, 'percentage')
                }}
                accessibilityLabel="Match score trend chart"
              />,
              `Average candidate match score in the last ${timeRange}`
            )
          )}
        </Grid>
      </Grid>
    </ErrorBoundary>
  );
});

AnalyticsMetrics.displayName = 'AnalyticsMetrics';

export default AnalyticsMetrics;
```

This implementation provides:

1. Comprehensive analytics metrics display with Material Design 3.0 styling
2. Responsive grid layout for different screen sizes
3. Loading states with skeletons
4. Error boundaries for graceful error handling
5. Accessible tooltips and ARIA labels
6. Memoized components and calculations for performance
7. Proper number formatting with localization
8. Trend visualization using the Chart component
9. Type safety with TypeScript interfaces
10. Integration with the project's theme system
11. Support for different time ranges
12. Error fallback component for graceful degradation

The component can be used like this:

```typescript
<AnalyticsMetrics
  totalSearches={1234}
  profilesFound={567}
  averageMatchScore={89.5}
  timeRange="month"
  trendData={[
    { date: '2023-07-01', searches: 100, profiles: 45, score: 88 },
    { date: '2023-07-02', searches: 120, profiles: 52, score: 90 },
    // ...more data points
  ]}
  isLoading={false}
  onError={(error) => console.error('Analytics Error:', error)}
/>