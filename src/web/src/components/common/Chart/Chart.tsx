import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'; // v2.7.0
import useResponsive from '../../../hooks/useResponsive';

/**
 * Props interface for the Chart component with enhanced configuration options
 */
interface ChartProps {
  /** Type of chart to render */
  type: 'line' | 'bar' | 'pie';
  /** Data array for chart visualization with validation */
  data: Array<any>;
  /** Key for X-axis data points */
  xKey: string;
  /** Key for Y-axis data points */
  yKey: string;
  /** Optional chart height in pixels */
  height?: number;
  /** Optional chart width in pixels */
  width?: number;
  /** Optional CSS class name */
  className?: string;
  /** Enable/disable chart animations */
  animate?: boolean;
  /** Custom tooltip configuration */
  tooltipConfig?: {
    formatter?: (value: any) => string;
    labelFormatter?: (label: any) => string;
  };
  /** ARIA label for chart */
  accessibilityLabel?: string;
}

/**
 * A reusable chart component that renders various types of charts using Recharts
 * with Material Design 3.0 theming, responsive layout, and accessibility support.
 */
const Chart = React.memo(({
  type,
  data,
  xKey,
  yKey,
  height = 400,
  width,
  className,
  animate = true,
  tooltipConfig,
  accessibilityLabel
}: ChartProps) => {
  const theme = useTheme();
  const { isMobile, currentBreakpoint } = useResponsive();

  // Calculate responsive dimensions
  const chartDimensions = useMemo(() => {
    const baseHeight = height;
    const baseWidth = width || '100%';

    return {
      height: isMobile ? baseHeight * 0.8 : baseHeight,
      width: baseWidth
    };
  }, [height, width, isMobile]);

  // Theme-based chart colors and styles
  const chartStyles = useMemo(() => ({
    colors: {
      primary: theme.palette.primary.main,
      secondary: theme.palette.secondary.main,
      grid: theme.palette.mode === 'light' 
        ? 'rgba(0, 0, 0, 0.12)' 
        : 'rgba(255, 255, 255, 0.12)',
      text: theme.palette.text.primary
    },
    font: theme.typography.body2
  }), [theme]);

  // Common chart props
  const commonProps = {
    width: chartDimensions.width,
    height: chartDimensions.height,
    margin: {
      top: 20,
      right: 30,
      left: 20,
      bottom: 30
    },
    className
  };

  // Tooltip customization
  const tooltipStyles = {
    contentStyle: {
      background: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1),
      ...theme.typography.body2
    },
    cursor: { stroke: theme.palette.primary.main }
  };

  // Render appropriate chart based on type
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps} data={data}>
            <CartesianGrid stroke={chartStyles.colors.grid} strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey}
              tick={{ fill: chartStyles.colors.text }}
              stroke={chartStyles.colors.grid}
            />
            <YAxis 
              tick={{ fill: chartStyles.colors.text }}
              stroke={chartStyles.colors.grid}
            />
            <Tooltip {...tooltipConfig} {...tooltipStyles} />
            <Legend wrapperStyle={{ ...chartStyles.font }} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={chartStyles.colors.primary}
              activeDot={{ r: 8 }}
              animationDuration={animate ? 1500 : 0}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps} data={data}>
            <CartesianGrid stroke={chartStyles.colors.grid} strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey}
              tick={{ fill: chartStyles.colors.text }}
              stroke={chartStyles.colors.grid}
            />
            <YAxis 
              tick={{ fill: chartStyles.colors.text }}
              stroke={chartStyles.colors.grid}
            />
            <Tooltip {...tooltipConfig} {...tooltipStyles} />
            <Legend wrapperStyle={{ ...chartStyles.font }} />
            <Bar
              dataKey={yKey}
              fill={chartStyles.colors.primary}
              animationDuration={animate ? 1500 : 0}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={isMobile ? 80 : 120}
              fill={chartStyles.colors.primary}
              label
              animationDuration={animate ? 1500 : 0}
            />
            <Tooltip {...tooltipConfig} {...tooltipStyles} />
            <Legend wrapperStyle={{ ...chartStyles.font }} />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      role="img"
      aria-label={accessibilityLabel || `${type} chart`}
      sx={{
        width: '100%',
        height: chartDimensions.height,
        '& .recharts-text': {
          ...chartStyles.font
        }
      }}
    >
      <ResponsiveContainer>
        {renderChart()}
      </ResponsiveContainer>
    </Box>
  );
});

Chart.displayName = 'Chart';

export default Chart;
```

This implementation provides:

1. Full integration with Material Design 3.0 theme system using MUI's useTheme hook
2. Responsive layout handling with useResponsive hook
3. Support for line, bar, and pie charts with consistent styling
4. Accessibility features including ARIA labels and roles
5. Performance optimization using React.memo and useMemo
6. Theme-aware styling for dark/light modes
7. Customizable tooltips and animations
8. TypeScript type safety with comprehensive interfaces
9. Responsive dimensions based on viewport size
10. Integration with the project's design system colors and typography

The component can be used like this:

```typescript
// Example usage
<Chart
  type="line"
  data={searchPerformanceData}
  xKey="date"
  yKey="searches"
  height={400}
  accessibilityLabel="Search performance over time"
  tooltipConfig={{
    formatter: (value) => `${value} searches`
  }}
/>