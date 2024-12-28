/**
 * @fileoverview TypeScript type definitions for LinkedIn profile data structures
 * Used throughout the frontend application for type safety and data consistency
 * @version 1.0.0
 */

/**
 * Interface representing a work experience entry in a LinkedIn profile
 * Contains detailed job information including company, title, dates, and highlights
 */
export interface ProfileExperience {
  id: string;
  companyName: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  skills: string[];
  highlights: string[];
}

/**
 * Interface representing an education entry in a LinkedIn profile
 * Contains comprehensive academic details including institution, degree, and activities
 */
export interface ProfileEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: Date;
  endDate: Date | null;
  grade: string | null;
  activities: string[];
}

/**
 * Interface representing a professional certification or credential
 * Includes certification details, issuing organization, and validity dates
 */
export interface ProfileCertification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: Date;
  expirationDate: Date | null;
  credentialId: string | null;
}

/**
 * Comprehensive interface for LinkedIn profile data
 * Contains all profile information including personal details, experience,
 * education, certifications, and metadata
 */
export interface Profile {
  id: string;
  linkedinUrl: string;
  fullName: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  experience: ProfileExperience[];
  education: ProfileEducation[];
  certifications: ProfileCertification[];
  skills: string[];
  languages: string[];
  recommendations: string[];
  matchScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzedAt: Date | null;
}

/**
 * Interface for AI-powered profile analysis results
 * Contains detailed scoring and evaluation of different profile aspects
 */
export interface ProfileAnalysis {
  profileId: string;
  skillMatch: Record<string, number>;
  experienceScore: number;
  educationScore: number;
  certificationScore: number;
  overallScore: number;
  confidenceScore: number;
  matchingKeywords: string[];
  analysisNotes: string[];
  analyzedAt: Date;
}