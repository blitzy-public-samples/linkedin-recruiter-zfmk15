/**
 * @fileoverview Analytics utility functions for LinkedIn Profile Search system
 * Provides comprehensive analytics processing, formatting and KPI tracking
 * @version 1.0.0
 */

import { format } from 'date-fns'; // v2.30.0
import { AnalysisResult } from '../types/analysis.types';
import { UserProfile } from '../types/auth.types';

/**
 * Metric type definitions for strong typing
 */
export type MetricType = 'percentage' | 'count' | 'score' | 'time';

/**
 * Interface for success metrics based on KPI requirements
 */
interface SuccessMetrics {
  efficiency: {
    screeningTimeReduction: number;
    averageProcessingTime: number;
  };
  quality: {
    matchAccuracy: number;
    confidenceScore: number;
  };
  volume: {
    dailyProfiles: number;
    totalProcessed: number;
  };
  cost: {
    costPerHire: number;
    costReduction: number;
  };
}

/**
 * Interface for search trend data
 */
interface SearchTrendData {
  date: string;
  searches: number;
}

/**
 * Constants for KPI thresholds based on technical specifications
 */
const KPI_THRESHOLDS = {
  SCREENING_TIME_REDUCTION: 75, // 75% reduction target
  MATCH_ACCURACY: 90, // 90% accuracy target
  DAILY_PROFILE_TARGET: 10000, // 10,000 profiles per day
  COST_REDUCTION: 50, // 50% cost reduction target
} as const;

/**
 * Calculates the average match score from a collection of analysis results
 * Handles edge cases and invalid data
 * 
 * @param results - Array of analysis results to process
 * @returns Average match score as a percentage
 */
export const calculateAverageMatchScore = (results: AnalysisResult[]): number => {
  if (!results || results.length === 0) {
    return 0;
  }

  const validResults = results.filter(result => 
    typeof result.overallMatchScore === 'number' && 
    result.overallMatchScore >= 0 &&
    result.overallMatchScore <= 100
  );

  if (validResults.length === 0) {
    return 0;
  }

  const sum = validResults.reduce((acc, curr) => acc + curr.overallMatchScore, 0);
  return Number((sum / validResults.length).toFixed(2));
};

/**
 * Formats metric values for display with appropriate units
 * Supports percentage, count, score, and time metrics
 * 
 * @param value - Numeric value to format
 * @param type - Type of metric for formatting
 * @returns Formatted string with appropriate units
 */
export const formatMetricValue = (value: number, type: MetricType): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'count':
      return value.toLocaleString();
    case 'score':
      return value.toFixed(2);
    case 'time':
      return `${value.toFixed(1)}s`;
    default:
      return value.toString();
  }
};

/**
 * Processes raw search data into trend analysis over time
 * Supports different time intervals for aggregation
 * 
 * @param searchData - Array of search data points with timestamps
 * @param interval - Time interval for grouping ('day' | 'week' | 'month')
 * @returns Array of processed trend data points
 */
export const calculateSearchTrends = (
  searchData: Array<{ timestamp: string; count: number }>,
  interval: 'day' | 'week' | 'month'
): SearchTrendData[] => {
  if (!searchData || searchData.length === 0) {
    return [];
  }

  const groupedData = new Map<string, number>();

  searchData.forEach(({ timestamp, count }) => {
    const date = new Date(timestamp);
    let formattedDate: string;

    switch (interval) {
      case 'day':
        formattedDate = format(date, 'yyyy-MM-dd');
        break;
      case 'week':
        formattedDate = format(date, 'yyyy-ww');
        break;
      case 'month':
        formattedDate = format(date, 'yyyy-MM');
        break;
    }

    groupedData.set(
      formattedDate,
      (groupedData.get(formattedDate) || 0) + count
    );
  });

  return Array.from(groupedData.entries())
    .map(([date, searches]) => ({ date, searches }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Calculates comprehensive success metrics based on analysis results and search data
 * Implements all KPIs from technical specifications
 * 
 * @param analysisResults - Array of analysis results
 * @param searchMetrics - Object containing search performance data
 * @returns Comprehensive success metrics object
 */
export const calculateSuccessMetrics = (
  analysisResults: AnalysisResult[],
  searchMetrics: {
    processingTimes: number[];
    costData: { previous: number; current: number };
    dailyVolume: number[];
  }
): SuccessMetrics => {
  // Calculate efficiency metrics
  const averageProcessingTime = searchMetrics.processingTimes.length > 0
    ? searchMetrics.processingTimes.reduce((a, b) => a + b, 0) / searchMetrics.processingTimes.length
    : 0;
  
  const screeningTimeReduction = 100 - (averageProcessingTime / searchMetrics.processingTimes[0] * 100);

  // Calculate quality metrics
  const matchAccuracy = calculateAverageMatchScore(analysisResults);
  const confidenceScore = analysisResults.reduce((acc, curr) => acc + curr.confidenceScore, 0) / analysisResults.length;

  // Calculate volume metrics
  const dailyProfiles = Math.round(
    searchMetrics.dailyVolume.reduce((a, b) => a + b, 0) / searchMetrics.dailyVolume.length
  );
  const totalProcessed = searchMetrics.dailyVolume.reduce((a, b) => a + b, 0);

  // Calculate cost metrics
  const costReduction = ((searchMetrics.costData.previous - searchMetrics.costData.current) 
    / searchMetrics.costData.previous) * 100;
  const costPerHire = searchMetrics.costData.current / totalProcessed;

  // Validate against KPI thresholds and log warnings if not met
  if (screeningTimeReduction < KPI_THRESHOLDS.SCREENING_TIME_REDUCTION) {
    console.warn(`Screening time reduction below target: ${screeningTimeReduction}% vs ${KPI_THRESHOLDS.SCREENING_TIME_REDUCTION}%`);
  }

  if (matchAccuracy < KPI_THRESHOLDS.MATCH_ACCURACY) {
    console.warn(`Match accuracy below target: ${matchAccuracy}% vs ${KPI_THRESHOLDS.MATCH_ACCURACY}%`);
  }

  if (dailyProfiles < KPI_THRESHOLDS.DAILY_PROFILE_TARGET) {
    console.warn(`Daily profile volume below target: ${dailyProfiles} vs ${KPI_THRESHOLDS.DAILY_PROFILE_TARGET}`);
  }

  return {
    efficiency: {
      screeningTimeReduction,
      averageProcessingTime
    },
    quality: {
      matchAccuracy,
      confidenceScore
    },
    volume: {
      dailyProfiles,
      totalProcessed
    },
    cost: {
      costPerHire,
      costReduction
    }
  };
};