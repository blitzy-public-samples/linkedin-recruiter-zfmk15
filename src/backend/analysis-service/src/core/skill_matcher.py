"""
Advanced ML-based skill matching engine that performs detailed analysis of candidate skills 
against job requirements with high accuracy.

Version: 1.0.0
"""

import numpy as np  # version ^1.24.0
from sklearn.feature_extraction.text import TfidfVectorizer  # version ^1.3.0
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging
from ..models.profile import Profile

# Constants for skill matching configuration
MIN_SKILL_MATCH_SCORE = 0.7  # Minimum threshold for skill match consideration
SKILL_WEIGHT_REQUIRED = 1.0  # Weight for required skills
SKILL_WEIGHT_PREFERRED = 0.5  # Weight for preferred skills

@dataclass
class SkillMatcher:
    """
    Advanced ML-based skill matching engine that performs detailed analysis of candidate
    skills against job requirements with high accuracy.
    """
    
    def __init__(self, skill_weights: Optional[Dict[str, float]] = None):
        """
        Initialize the skill matcher with customizable weights and ML components.
        
        Args:
            skill_weights: Optional custom weights for different skill types
        """
        # Initialize skill weights with defaults if not provided
        self.skill_weights = skill_weights or {
            'required': SKILL_WEIGHT_REQUIRED,
            'preferred': SKILL_WEIGHT_PREFERRED
        }
        
        # Configure TF-IDF vectorizer for skill text analysis
        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            analyzer='word',
            stop_words='english',
            ngram_range=(1, 2),
            max_features=5000
        )
        
        # Initialize similarity calculator
        self.similarity_calculator = cosine_similarity
        
        # Initialize cache for performance optimization
        self.cache = {}
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def calculate_skill_match(self, profile: Profile, 
                            job_requirements: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Calculate comprehensive match score with detailed analysis.
        
        Args:
            profile: Candidate profile object
            job_requirements: Dictionary containing required and preferred skills
            
        Returns:
            Dict containing detailed match analysis including scores, gaps, and recommendations
        """
        # Extract candidate skills
        candidate_skills = profile.get_all_skills()
        
        # Separate required and preferred skills
        required_skills = job_requirements.get('required', [])
        preferred_skills = job_requirements.get('preferred', [])
        
        # Calculate similarity scores
        required_score = self._calculate_skill_similarity(
            candidate_skills, required_skills
        ) if required_skills else 1.0
        
        preferred_score = self._calculate_skill_similarity(
            candidate_skills, preferred_skills
        ) if preferred_skills else 1.0
        
        # Calculate weighted total score
        total_score = (
            required_score * self.skill_weights['required'] +
            preferred_score * self.skill_weights['preferred']
        ) / sum(self.skill_weights.values())
        
        # Perform gap analysis
        gap_analysis = self.analyze_skill_gaps(candidate_skills, job_requirements)
        
        # Calculate confidence metrics
        confidence_score = self._calculate_confidence_score(
            total_score, gap_analysis['coverage_percentage']
        )
        
        return {
            'overall_match_score': round(total_score, 2),
            'required_skills_score': round(required_score, 2),
            'preferred_skills_score': round(preferred_score, 2),
            'confidence_score': round(confidence_score, 2),
            'gap_analysis': gap_analysis,
            'match_details': {
                'matched_required_skills': gap_analysis['matched_required'],
                'matched_preferred_skills': gap_analysis['matched_preferred'],
                'missing_critical_skills': gap_analysis['missing_critical'],
                'skill_improvement_recommendations': gap_analysis['recommendations']
            }
        }

    def analyze_skill_gaps(self, candidate_skills: List[str], 
                          job_requirements: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Perform detailed skill gap analysis with recommendations.
        
        Args:
            candidate_skills: List of candidate's skills
            job_requirements: Dictionary of required and preferred skills
            
        Returns:
            Comprehensive gap analysis with recommendations
        """
        required_skills = set(job_requirements.get('required', []))
        preferred_skills = set(job_requirements.get('preferred', []))
        candidate_skills_set = set(candidate_skills)
        
        # Find matched and missing skills
        matched_required = required_skills.intersection(candidate_skills_set)
        matched_preferred = preferred_skills.intersection(candidate_skills_set)
        missing_required = required_skills - candidate_skills_set
        missing_preferred = preferred_skills - candidate_skills_set
        
        # Calculate coverage percentages
        required_coverage = (
            len(matched_required) / len(required_skills) if required_skills else 1.0
        )
        preferred_coverage = (
            len(matched_preferred) / len(preferred_skills) if preferred_skills else 1.0
        )
        
        # Generate recommendations
        recommendations = self._generate_skill_recommendations(
            missing_required, missing_preferred, candidate_skills_set
        )
        
        return {
            'matched_required': list(matched_required),
            'matched_preferred': list(matched_preferred),
            'missing_critical': list(missing_required),
            'missing_preferred': list(missing_preferred),
            'coverage_percentage': {
                'required': round(required_coverage * 100, 1),
                'preferred': round(preferred_coverage * 100, 1)
            },
            'recommendations': recommendations
        }

    def _calculate_skill_similarity(self, skills_a: List[str], 
                                  skills_b: List[str]) -> float:
        """
        Calculate normalized similarity between skill sets using TF-IDF and cosine similarity.
        
        Args:
            skills_a: First set of skills
            skills_b: Second set of skills
            
        Returns:
            Normalized similarity score between 0 and 1
        """
        # Create cache key
        cache_key = f"{','.join(sorted(skills_a))}|{','.join(sorted(skills_b))}"
        
        # Check cache first
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Prepare skill texts for vectorization
        skills_a_text = ' '.join(skills_a).lower()
        skills_b_text = ' '.join(skills_b).lower()
        
        # Generate TF-IDF vectors
        try:
            tfidf_matrix = self.vectorizer.fit_transform([skills_a_text, skills_b_text])
            similarity_score = float(
                self.similarity_calculator(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            )
        except Exception as e:
            self.logger.error(f"Error calculating similarity: {str(e)}")
            similarity_score = 0.0
        
        # Normalize score
        normalized_score = max(0.0, min(1.0, similarity_score))
        
        # Cache the result
        self.cache[cache_key] = normalized_score
        
        return normalized_score

    def _calculate_confidence_score(self, match_score: float, 
                                  coverage_metrics: Dict[str, float]) -> float:
        """
        Calculate confidence score based on match score and coverage metrics.
        
        Args:
            match_score: Overall match score
            coverage_metrics: Dictionary of coverage percentages
            
        Returns:
            Confidence score between 0 and 1
        """
        required_coverage = coverage_metrics['required'] / 100
        preferred_coverage = coverage_metrics['preferred'] / 100
        
        # Weight the confidence components
        confidence = (
            match_score * 0.4 +
            required_coverage * 0.4 +
            preferred_coverage * 0.2
        )
        
        return max(0.0, min(1.0, confidence))

    def _generate_skill_recommendations(self, missing_required: set, 
                                      missing_preferred: set,
                                      existing_skills: set) -> List[Dict[str, Any]]:
        """
        Generate prioritized skill improvement recommendations.
        
        Args:
            missing_required: Set of missing required skills
            missing_preferred: Set of missing preferred skills
            existing_skills: Set of candidate's existing skills
            
        Returns:
            List of skill recommendations with priorities and rationale
        """
        recommendations = []
        
        # Process critical missing skills first
        for skill in missing_required:
            recommendations.append({
                'skill': skill,
                'priority': 'High',
                'rationale': 'Critical required skill for the role',
                'estimated_acquisition_time': '1-3 months',
                'prerequisites': self._identify_skill_prerequisites(skill, existing_skills)
            })
            
        # Process preferred skills
        for skill in missing_preferred:
            recommendations.append({
                'skill': skill,
                'priority': 'Medium',
                'rationale': 'Preferred skill that would strengthen profile',
                'estimated_acquisition_time': '1-2 months',
                'prerequisites': self._identify_skill_prerequisites(skill, existing_skills)
            })
            
        return sorted(recommendations, key=lambda x: x['priority'] == 'High', reverse=True)

    def _identify_skill_prerequisites(self, skill: str, 
                                    existing_skills: set) -> List[str]:
        """
        Identify prerequisites for acquiring a new skill based on existing skillset.
        
        Args:
            skill: Target skill to acquire
            existing_skills: Set of candidate's existing skills
            
        Returns:
            List of prerequisite skills or learning recommendations
        """
        # This is a simplified implementation - in production, this would use
        # a more sophisticated skill graph or knowledge base
        common_skill_prerequisites = {
            'machine learning': ['python', 'statistics', 'mathematics'],
            'deep learning': ['machine learning', 'python'],
            'kubernetes': ['docker', 'linux'],
            'react': ['javascript', 'html', 'css'],
            'nodejs': ['javascript'],
            'aws': ['cloud computing'],
        }
        
        skill_lower = skill.lower()
        if skill_lower in common_skill_prerequisites:
            prerequisites = common_skill_prerequisites[skill_lower]
            missing_prerequisites = [
                prereq for prereq in prerequisites 
                if prereq not in existing_skills
            ]
            return missing_prerequisites
            
        return []