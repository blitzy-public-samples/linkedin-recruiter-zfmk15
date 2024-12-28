/**
 * @fileoverview Comprehensive validation utilities for form and data validation
 * @version 1.0.0
 * @description Implements robust validation with enhanced security features for search criteria,
 * profile data, and general form input validation throughout the frontend application
 */

import * as yup from 'yup'; // v1.2.0
import validator from 'validator'; // v13.9.0
import xss from 'xss'; // v1.0.14
import { SearchCriteria } from '../types/search.types';
import { Profile } from '../types/profile.types';

// Constants for validation rules
const MIN_KEYWORDS_LENGTH = 3;
const MAX_KEYWORDS_LENGTH = 100;
const MIN_SKILLS_LENGTH = 1;
const MAX_SKILLS_LENGTH = 50;
const MAX_EXPERIENCE_YEARS = 50;
const LINKEDIN_URL_REGEX = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9-]{3,100}\/?$/;
const ALLOWED_SPECIAL_CHARS = /^[-_.,@#$%&*()\s]*$/;
const SQL_INJECTION_PATTERNS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', '--'];

/**
 * Interface for validation result object
 */
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Options for input sanitization
 */
interface SanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
}

/**
 * Enhanced validation schema for search criteria
 */
const searchCriteriaSchema = yup.object().shape({
  keywords: yup.string()
    .required('Keywords are required')
    .min(MIN_KEYWORDS_LENGTH, `Keywords must be at least ${MIN_KEYWORDS_LENGTH} characters`)
    .max(MAX_KEYWORDS_LENGTH, `Keywords must not exceed ${MAX_KEYWORDS_LENGTH} characters`)
    .test('sql-injection', 'Invalid characters detected', value => 
      !SQL_INJECTION_PATTERNS.some(pattern => 
        value?.toUpperCase().includes(pattern)
      )
    ),
  
  experienceYears: yup.object().shape({
    min: yup.number()
      .min(0, 'Minimum experience cannot be negative')
      .max(MAX_EXPERIENCE_YEARS, `Maximum experience cannot exceed ${MAX_EXPERIENCE_YEARS} years`),
    max: yup.number()
      .min(0, 'Maximum experience cannot be negative')
      .max(MAX_EXPERIENCE_YEARS, `Maximum experience cannot exceed ${MAX_EXPERIENCE_YEARS} years`)
      .test('min-max', 'Maximum experience must be greater than minimum', function(max) {
        const min = this.parent.min;
        return !min || !max || max >= min;
      })
  }),

  requiredSkills: yup.array()
    .of(yup.string().trim())
    .min(MIN_SKILLS_LENGTH, 'At least one required skill must be specified')
    .max(MAX_SKILLS_LENGTH, `Cannot exceed ${MAX_SKILLS_LENGTH} required skills`)
    .test('unique-skills', 'Duplicate skills are not allowed', 
      value => new Set(value).size === value?.length
    ),

  location: yup.string()
    .nullable()
    .test('valid-location', 'Invalid location format', value => 
      !value || (value.length > 0 && ALLOWED_SPECIAL_CHARS.test(value))
    )
});

/**
 * Enhanced validation schema for profile data
 */
const profileSchema = yup.object().shape({
  linkedinUrl: yup.string()
    .required('LinkedIn URL is required')
    .matches(LINKEDIN_URL_REGEX, 'Invalid LinkedIn URL format'),

  experience: yup.array().of(
    yup.object().shape({
      startDate: yup.date().required('Start date is required'),
      endDate: yup.date().nullable()
        .test('valid-date-range', 'End date must be after start date', 
          function(endDate) {
            return !endDate || endDate >= this.parent.startDate;
          }
        ),
      companyName: yup.string().required('Company name is required'),
      title: yup.string().required('Job title is required')
    })
  ),

  education: yup.array().of(
    yup.object().shape({
      institution: yup.string().required('Institution is required'),
      degree: yup.string().required('Degree is required'),
      startDate: yup.date().required('Start date is required'),
      endDate: yup.date().nullable()
        .test('valid-date-range', 'End date must be after start date',
          function(endDate) {
            return !endDate || endDate >= this.parent.startDate;
          }
        )
    })
  ),

  skills: yup.array()
    .of(yup.string())
    .min(MIN_SKILLS_LENGTH, 'At least one skill is required')
    .max(MAX_SKILLS_LENGTH, `Cannot exceed ${MAX_SKILLS_LENGTH} skills`)
    .test('unique-skills', 'Duplicate skills are not allowed',
      value => new Set(value).size === value?.length
    )
});

/**
 * Validates search criteria with comprehensive error handling
 * @param criteria Search criteria to validate
 * @returns Validation result with detailed error messages
 */
export async function validateSearchCriteria(criteria: SearchCriteria): Promise<ValidationResult> {
  try {
    await searchCriteriaSchema.validate(criteria, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach(err => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    throw error;
  }
}

/**
 * Validates profile data with comprehensive field checks
 * @param profile Profile data to validate
 * @returns Validation result with detailed error messages
 */
export async function validateProfileData(profile: Profile): Promise<ValidationResult> {
  try {
    await profileSchema.validate(profile, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach(err => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    throw error;
  }
}

/**
 * Advanced input sanitization with multiple security layers
 * @param input Input string to sanitize
 * @param options Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, options: SanitizeOptions = {}): string {
  const {
    allowHtml = false,
    maxLength,
    trimWhitespace = true
  } = options;

  // Initial cleanup
  let sanitized = input;
  
  // Trim whitespace if specified
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Apply XSS prevention
  if (!allowHtml) {
    sanitized = xss(sanitized, {
      whiteList: {},  // No tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }

  // Escape special characters
  sanitized = validator.escape(sanitized);

  // Remove potential SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(new RegExp(pattern, 'gi'), '');
  });

  // Enforce maximum length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Final validation of allowed characters
  sanitized = sanitized.replace(/[^\w\s-_.,@#$%&*()]/g, '');

  return sanitized;
}

/**
 * Validates a LinkedIn URL format
 * @param url LinkedIn URL to validate
 * @returns boolean indicating if URL is valid
 */
export function isValidLinkedInUrl(url: string): boolean {
  return LINKEDIN_URL_REGEX.test(url) && validator.isURL(url, {
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true
  });
}

/**
 * Validates chronological order of date ranges
 * @param startDate Start date to validate
 * @param endDate End date to validate
 * @returns boolean indicating if date range is valid
 */
export function isValidDateRange(startDate: Date, endDate: Date | null): boolean {
  if (!endDate) return true;
  return startDate <= endDate;
}