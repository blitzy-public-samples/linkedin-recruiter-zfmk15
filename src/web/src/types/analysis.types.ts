/**
 * @fileoverview TypeScript type definitions for AI-powered profile analysis results
 * Contains comprehensive interfaces for Claude AI candidate evaluation and scoring
 * @version 1.0.0
 */

import { Profile } from './profile.types';

/**
 * Interface for detailed skill analysis results
 * Provides comprehensive evaluation of individual skills including proficiency,
 * experience, and validation metrics
 */
export interface SkillAnalysis {
  skillName: string;
  proficiencyScore: number;  // 0-100 score indicating skill mastery
  yearsOfExperience: number;
  relatedExperiences: string[];  // References to relevant work experiences
  lastUsed: string | null;  // ISO date string of most recent usage
  certificationValidation: boolean;  // Verified by certification
  skillTrends: Record<string, number>;  // Industry trend relevance scores
}

/**
 * Interface for experience analysis results
 * Evaluates professional experience relevance and impact
 */
export interface ExperienceAnalysis {
  roleRelevanceScore: number;  // 0-100 score for role alignment
  industryMatchScore: number;  // 0-100 score for industry relevance
  responsibilityMatchScore: number;  // 0-100 score for responsibility match
  keyAchievements: string[];  // Notable accomplishments
  skillDemonstration: Record<string, number>;  // Skill usage frequency
  projectImpactScore: number;  // 0-100 score for project outcomes
  teamSizeManaged: number | null;  // Size of team managed if applicable
}

/**
 * Main interface for complete AI analysis results
 * Comprehensive evaluation combining all aspects of candidate assessment
 */
export interface AnalysisResult {
  id: string;
  profileId: string;  // References Profile.id
  overallMatchScore: number;  // 0-100 composite score
  skillAnalysis: SkillAnalysis[];
  experienceAnalysis: ExperienceAnalysis[];
  competencyScores: Record<string, number>;  // Scores for key competencies
  strengths: string[];  // Key candidate strengths
  areasOfImprovement: string[];  // Growth opportunities
  aiInsights: Record<string, any>;  // Additional Claude AI insights
  analyzedAt: Date;  // Timestamp of analysis
  confidenceScore: number;  // 0-100 AI confidence level
  requirementMatchScore: number;  // 0-100 job requirement match
  cultureFitScore: number;  // 0-100 organizational fit score
  potentialFlags: string[];  // Potential concerns or highlights
  searchCriteriaMeta: Record<string, any>;  // Search criteria context
}

/**
 * Enum for tracking the status of analysis requests
 * Used for monitoring the progress of Claude AI analysis
 */
export enum AnalysisStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}