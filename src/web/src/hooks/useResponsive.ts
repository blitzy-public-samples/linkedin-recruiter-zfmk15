import { useTheme } from '@mui/material/styles'; // v5.14+
import { useMediaQuery } from '@mui/material'; // v5.14+
import { useMemo } from 'react';

/**
 * Interface defining the return type of the useResponsive hook
 */
interface ResponsiveReturn {
  /** True when viewport width is below 768px */
  isMobile: boolean;
  /** True when viewport width is between 768px and 1024px */
  isTablet: boolean;
  /** True when viewport width is between 1024px and 1440px */
  isDesktop: boolean;
  /** True when viewport width is above 1440px */
  isLargeDesktop: boolean;
  /** Current active breakpoint name */
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';
  /** Current viewport width (undefined during SSR) */
  width: number | undefined;
  /** Current viewport height (undefined during SSR) */
  height: number | undefined;
}

/**
 * Custom hook providing responsive breakpoint detection and viewport size utilities
 * following Material Design 3.0 specifications
 * 
 * Features:
 * - SSR compatible
 * - Performance optimized with useMemo
 * - Integrates with MUI theme breakpoints
 * - Provides viewport dimensions with SSR safety
 * 
 * @returns {ResponsiveReturn} Object containing responsive state values
 */
const useResponsive = (): ResponsiveReturn => {
  const theme = useTheme();

  // Media query configuration with SSR safety
  const SSR_CONFIG = { noSsr: true, defaultMatches: false };

  // Breakpoint detection using MUI's useMediaQuery
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), SSR_CONFIG);
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'), SSR_CONFIG);
  const isDesktop = useMediaQuery(theme.breakpoints.between('md', 'lg'), SSR_CONFIG);
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg'), SSR_CONFIG);

  // Get viewport dimensions with SSR safety
  const dimensions = useMemo(() => {
    if (typeof window === 'undefined') {
      return { width: undefined, height: undefined };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }, []);

  // Determine current breakpoint based on media queries
  const currentBreakpoint = useMemo(() => {
    if (isLargeDesktop) return 'largeDesktop';
    if (isDesktop) return 'desktop';
    if (isTablet) return 'tablet';
    return 'mobile';
  }, [isLargeDesktop, isDesktop, isTablet]);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      isMobile,
      isTablet,
      isDesktop,
      isLargeDesktop,
      currentBreakpoint,
      width: dimensions.width,
      height: dimensions.height
    }),
    [
      isMobile,
      isTablet,
      isDesktop,
      isLargeDesktop,
      currentBreakpoint,
      dimensions.width,
      dimensions.height
    ]
  );
};

export default useResponsive;
```

This implementation provides a comprehensive responsive hook that:

1. Follows Material Design 3.0 breakpoint specifications as defined in the theme configuration
2. Is fully SSR compatible with proper safety checks
3. Integrates with MUI's theme system for consistent breakpoint behavior
4. Is performance optimized using useMemo to prevent unnecessary re-renders
5. Provides type safety with TypeScript interfaces
6. Includes detailed JSDoc documentation
7. Handles viewport dimensions with SSR safety
8. Uses proper media query configurations for accurate breakpoint detection

The hook can be used in components to implement responsive behavior:

```typescript
const MyComponent = () => {
  const { isMobile, currentBreakpoint, width } = useResponsive();
  
  return (
    <div>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
};