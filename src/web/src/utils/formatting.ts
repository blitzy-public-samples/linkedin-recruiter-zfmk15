/**
 * @fileoverview Utility functions for formatting data values with internationalization support
 * @version 1.0.0
 * @description Provides consistent data formatting across the frontend application
 * including dates, numbers, text and profile-specific information with i18n support
 */

import { format, formatDistance, Locale } from 'date-fns';
import i18n from 'i18next';
import { Profile } from '../types/profile.types';
import { SearchCriteria } from '../types/search.types';

// date-fns v2.30.0
// i18next v23.0.0

/**
 * Global constants for date and time formatting
 */
export const DATE_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm:ss';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DEFAULT_LOCALE = 'en-US';
export const SUPPORTED_LOCALES = ['en-US', 'es-ES', 'fr-FR'] as const;

/**
 * Formats a date using the application's standard date format with locale support
 * @param date - Date to format
 * @param formatStr - Optional format string (defaults to DATE_FORMAT)
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Formatted date string in the specified locale
 */
export const formatDate = (
  date: Date | null,
  formatStr: string = DATE_FORMAT,
  locale?: string
): string => {
  if (!date) {
    return '';
  }

  try {
    const currentLocale = locale || i18n.language || DEFAULT_LOCALE;
    return format(date, formatStr, { 
      locale: require(`date-fns/locale/${currentLocale}`)
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return format(date, formatStr); // Fallback to default locale
  }
};

/**
 * Formats a date as a relative time string with localization
 * @param date - Date to format relative to now
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Localized relative time string
 */
export const formatRelativeTime = (
  date: Date | null,
  locale?: string
): string => {
  if (!date) {
    return '';
  }

  try {
    const currentLocale = locale || i18n.language || DEFAULT_LOCALE;
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: require(`date-fns/locale/${currentLocale}`)
    });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return formatDistance(date, new Date(), { addSuffix: true }); // Fallback
  }
};

/**
 * Formats a number as a percentage with locale-specific formatting
 * @param value - Number to format as percentage (0-1)
 * @param decimalPlaces - Number of decimal places to display
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Locale-specific formatted percentage string
 */
export const formatPercentage = (
  value: number,
  decimalPlaces: number = 0,
  locale?: string
): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0%';
  }

  try {
    const currentLocale = locale || i18n.language || DEFAULT_LOCALE;
    return new Intl.NumberFormat(currentLocale, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value);
  } catch (error) {
    console.error('Percentage formatting error:', error);
    return `${(value * 100).toFixed(decimalPlaces)}%`; // Fallback
  }
};

/**
 * Formats a profile name according to application standards
 * Handles proper capitalization and special cases
 * @param profile - Profile object containing name information
 * @returns Properly formatted profile name
 */
export const formatProfileName = (profile: Profile): string => {
  if (!profile?.fullName) {
    return '';
  }

  try {
    // Split name into components
    const nameParts = profile.fullName.trim().split(/\s+/);
    
    // Apply proper capitalization rules
    const formattedParts = nameParts.map(part => {
      // Handle hyphenated names
      if (part.includes('-')) {
        return part.split('-')
          .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .join('-');
      }
      
      // Handle special prefixes (de, van, etc.)
      const lowerCasePrefixes = ['de', 'van', 'von', 'del', 'la', 'el'];
      if (lowerCasePrefixes.includes(part.toLowerCase())) {
        return part.toLowerCase();
      }
      
      // Standard capitalization
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    });

    return formattedParts.join(' ');
  } catch (error) {
    console.error('Profile name formatting error:', error);
    return profile.fullName; // Fallback to original name
  }
};

/**
 * Formats an array of skills into a readable string with localized separators
 * @param skills - Array of skill strings to format
 * @param maxDisplay - Maximum number of skills to display before truncating
 * @param locale - Optional locale string (defaults to current i18n locale)
 * @returns Localized comma-separated skill list with optional truncation
 */
export const formatSkillList = (
  skills: string[],
  maxDisplay: number = 5,
  locale?: string
): string => {
  if (!Array.isArray(skills) || skills.length === 0) {
    return '';
  }

  try {
    const currentLocale = locale || i18n.language || DEFAULT_LOCALE;
    const listFormatter = new Intl.ListFormat(currentLocale, {
      style: 'long',
      type: 'conjunction'
    });

    const displaySkills = skills.slice(0, maxDisplay);
    const remainingCount = skills.length - maxDisplay;

    if (remainingCount > 0) {
      const moreText = i18n.t('common.moreItems', { count: remainingCount });
      return `${listFormatter.format(displaySkills)} ${moreText}`;
    }

    return listFormatter.format(displaySkills);
  } catch (error) {
    console.error('Skill list formatting error:', error);
    // Fallback to basic comma separation
    const displaySkills = skills.slice(0, maxDisplay).join(', ');
    const remainingCount = skills.length - maxDisplay;
    return remainingCount > 0 
      ? `${displaySkills} +${remainingCount} more`
      : displaySkills;
  }
};