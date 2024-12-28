"""
Core component for comprehensive LinkedIn profile analysis using Claude AI and skill matching.
Provides detailed candidate evaluation and scoring with enhanced validation and monitoring.

Version: 1.0.0
"""

import asyncio
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from cachetools import TTLCache  # version: 5.3+
import structlog  # version: 23.1+

from .claude_client import ClaudeClient
from .skill_matcher import SkillMatcher
from ..models.profile import Profile

# Analysis configuration constants
MIN_MATCH_SCORE = 0.7
EXPERIENCE_WEIGHT = 0.3
SKILLS_WEIGHT = 0.4
AI_ANALYSIS_WEIGHT = 0.3
CACHE_TTL_SECONDS = 3600
MAX_RETRIES = 3
CONFIDENCE_THRESHOLD = 0.85

@dataclass
class ProfileAnalyzer:
    """
    Enhanced main class for comprehensive profile analysis combining AI evaluation 
    and skill matching with improved validation, caching, and monitoring.
    """
    
    _claude_client: ClaudeClient
    _skill_matcher: SkillMatcher
    _analysis_cache: Optional[TTLCache] = None
    _logger: Optional[structlog.BoundLogger] = None

    def __init__(
        self,
        claude_client: ClaudeClient,
        skill_matcher: SkillMatcher,
        cache: Optional[TTLCache] = None,
        logger: Optional[structlog.BoundLogger] = None
    ):
        """Initialize profile analyzer with enhanced components and monitoring."""
        self._claude_client = claude_client
        self._skill_matcher = skill_matcher
        
        # Initialize cache with TTL if not provided
        self._analysis_cache = cache or TTLCache(
            maxsize=1000,
            ttl=CACHE_TTL_SECONDS
        )
        
        # Initialize structured logger
        self._logger = logger or structlog.get_logger(__name__)
        
        self._logger.info(
            "Profile analyzer initialized",
            cache_size=self._analysis_cache.maxsize,
            cache_ttl=CACHE_TTL_SECONDS
        )

    async def analyze_profile(
        self,
        profile: Profile,
        job_requirements: Dict[str, Any],
        use_cache: Optional[bool] = True
    ) -> Dict[str, Any]:
        """
        Perform comprehensive profile analysis with enhanced validation and caching.
        
        Args:
            profile: LinkedIn profile to analyze
            job_requirements: Job requirements for matching
            use_cache: Whether to use cached results
            
        Returns:
            Dict containing detailed analysis results with scores and insights
            
        Raises:
            ValueError: If input validation fails
            RuntimeError: If analysis fails
        """
        try:
            # Generate cache key if caching enabled
            cache_key = None
            if use_cache:
                cache_key = f"{profile.id}:{hash(frozenset(job_requirements.items()))}"
                if cache_key in self._analysis_cache:
                    self._logger.info("Returning cached analysis", profile_id=str(profile.id))
                    return self._analysis_cache[cache_key]

            # Validate inputs
            if not profile.validate_profile_data():
                raise ValueError("Invalid profile data")
            if not job_requirements.get('required_skills'):
                raise ValueError("Job requirements must include required skills")

            # Calculate experience match
            experience_score = self._calculate_experience_match(
                profile.get_total_experience(),
                job_requirements.get('min_experience', 0),
                job_requirements.get('max_experience')
            )

            # Perform skill matching analysis
            skill_match_results = self._skill_matcher.calculate_skill_match(
                profile,
                {
                    'required': job_requirements.get('required_skills', []),
                    'preferred': job_requirements.get('preferred_skills', [])
                }
            )

            # Get AI-powered analysis
            ai_analysis = await self._claude_client.analyze_profile(
                profile.to_dict(),
                job_requirements,
                str(profile.id)
            )

            # Calculate combined score with weights
            combined_score = (
                experience_score * EXPERIENCE_WEIGHT +
                skill_match_results['overall_match_score'] * SKILLS_WEIGHT +
                ai_analysis['match_score'] * AI_ANALYSIS_WEIGHT
            )

            # Calculate confidence metrics
            confidence_score = min(
                skill_match_results['confidence_score'],
                ai_analysis['confidence_score']
            )

            # Prepare comprehensive analysis results
            analysis_results = {
                'profile_id': str(profile.id),
                'overall_match_score': round(combined_score * 100, 2),
                'confidence_score': round(confidence_score * 100, 2),
                'experience_analysis': {
                    'score': round(experience_score * 100, 2),
                    'total_months': profile.get_total_experience(),
                    'meets_requirements': experience_score >= MIN_MATCH_SCORE
                },
                'skill_analysis': {
                    'score': round(skill_match_results['overall_match_score'] * 100, 2),
                    'matched_required': skill_match_results['match_details']['matched_required_skills'],
                    'matched_preferred': skill_match_results['match_details']['matched_preferred_skills'],
                    'missing_critical': skill_match_results['match_details']['missing_critical_skills'],
                    'recommendations': skill_match_results['match_details']['skill_improvement_recommendations']
                },
                'ai_insights': {
                    'score': round(ai_analysis['match_score'] * 100, 2),
                    'analysis': ai_analysis['analysis'],
                    'key_strengths': ai_analysis.get('strengths', []),
                    'improvement_areas': ai_analysis.get('gaps', [])
                },
                'metadata': {
                    'timestamp': ai_analysis['timestamp'],
                    'model_version': ai_analysis['model'],
                    'processing_time': ai_analysis['processing_time']
                }
            }

            # Cache results if enabled
            if use_cache and cache_key:
                self._analysis_cache[cache_key] = analysis_results

            self._logger.info(
                "Profile analysis completed",
                profile_id=str(profile.id),
                match_score=analysis_results['overall_match_score'],
                confidence_score=analysis_results['confidence_score']
            )

            return analysis_results

        except Exception as e:
            self._logger.error(
                "Profile analysis failed",
                profile_id=str(profile.id),
                error=str(e),
                exc_info=True
            )
            raise

    def _calculate_experience_match(
        self,
        total_experience: int,
        min_required: int,
        max_required: Optional[int] = None
    ) -> float:
        """
        Calculate experience match score based on requirements.
        
        Args:
            total_experience: Total months of experience
            min_required: Minimum required months
            max_required: Maximum preferred months (optional)
            
        Returns:
            float: Normalized match score between 0 and 1
        """
        if total_experience < min_required:
            # Below minimum requirements
            return max(0.0, total_experience / min_required)
            
        if max_required and total_experience > max_required:
            # Above maximum preferred
            return max(0.7, 1 - (total_experience - max_required) / max_required)
            
        # Within desired range
        return 1.0