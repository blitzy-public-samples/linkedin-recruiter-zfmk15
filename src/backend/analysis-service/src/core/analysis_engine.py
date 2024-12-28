"""
Core orchestration engine for LinkedIn profile analysis.
Coordinates AI evaluation, skill matching, and experience analysis to generate 
comprehensive candidate assessments with enhanced performance and reliability.

Version: 1.0.0
"""

import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from cachetools import TTLCache  # version: 5.3+
from tenacity import (  # version: 8.2+
    retry,
    stop_after_attempt,
    wait_exponential,
    RetryError
)
import logging

from .claude_client import ClaudeClient
from .profile_analyzer import ProfileAnalyzer
from .skill_matcher import SkillMatcher
from ..models.profile import Profile

# Configuration constants
ANALYSIS_BATCH_SIZE = 50  # Maximum profiles to analyze in parallel
MAX_CONCURRENT_ANALYSES = 20  # Concurrency limit
MIN_CONFIDENCE_SCORE = 0.75  # Minimum acceptable confidence threshold
RETRY_MAX_ATTEMPTS = 3  # Maximum retry attempts for failed operations
CACHE_TTL_SECONDS = 3600  # Cache TTL in seconds
RATE_LIMIT_CALLS = 100  # Rate limit for API calls
RATE_LIMIT_PERIOD = 60  # Rate limit period in seconds

@dataclass
class AnalysisEngine:
    """
    Enhanced orchestration engine for coordinating profile analysis workflow
    with improved performance, reliability, and monitoring capabilities.
    """

    _claude_client: ClaudeClient
    _profile_analyzer: ProfileAnalyzer
    _skill_matcher: SkillMatcher
    _concurrency_limiter: asyncio.Semaphore
    _analysis_cache: TTLCache
    _logger: logging.Logger

    def __init__(
        self,
        claude_client: ClaudeClient,
        profile_analyzer: ProfileAnalyzer,
        skill_matcher: SkillMatcher
    ):
        """
        Initialize analysis engine with required components and enhanced controls.

        Args:
            claude_client: Configured Claude AI client
            profile_analyzer: Profile analysis component
            skill_matcher: Skill matching component
        """
        self._claude_client = claude_client
        self._profile_analyzer = profile_analyzer
        self._skill_matcher = skill_matcher
        
        # Initialize concurrency controls
        self._concurrency_limiter = asyncio.Semaphore(MAX_CONCURRENT_ANALYSES)
        
        # Initialize caching
        self._analysis_cache = TTLCache(
            maxsize=1000,
            ttl=CACHE_TTL_SECONDS
        )
        
        # Configure logging
        self._logger = logging.getLogger(__name__)
        
        self._logger.info(
            "Analysis engine initialized",
            extra={
                "max_concurrent": MAX_CONCURRENT_ANALYSES,
                "batch_size": ANALYSIS_BATCH_SIZE,
                "cache_ttl": CACHE_TTL_SECONDS
            }
        )

    @retry(
        stop=stop_after_attempt(RETRY_MAX_ATTEMPTS),
        wait=wait_exponential(multiplier=2)
    )
    async def analyze_profiles(
        self,
        profiles: List[Profile],
        job_requirements: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple profiles concurrently with enhanced performance and reliability.

        Args:
            profiles: List of profiles to analyze
            job_requirements: Job requirements for matching

        Returns:
            List of analysis results with confidence scores

        Raises:
            ValueError: If input validation fails
            RuntimeError: If analysis fails after retries
        """
        try:
            # Validate inputs
            if not profiles:
                raise ValueError("No profiles provided for analysis")
            if not job_requirements:
                raise ValueError("Job requirements not provided")

            # Split profiles into optimal batch sizes
            batches = [
                profiles[i:i + ANALYSIS_BATCH_SIZE]
                for i in range(0, len(profiles), ANALYSIS_BATCH_SIZE)
            ]

            # Process batches concurrently
            all_results = []
            for batch in batches:
                # Create analysis tasks
                tasks = [
                    self.analyze_single_profile(profile, job_requirements)
                    for profile in batch
                ]
                
                # Execute batch with concurrency control
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Handle results and exceptions
                for result in batch_results:
                    if isinstance(result, Exception):
                        self._logger.error(
                            "Profile analysis failed",
                            extra={"error": str(result)},
                            exc_info=True
                        )
                    else:
                        all_results.append(result)

            self._logger.info(
                "Batch analysis completed",
                extra={
                    "total_profiles": len(profiles),
                    "successful_analyses": len(all_results)
                }
            )

            return all_results

        except Exception as e:
            self._logger.error(
                "Batch analysis failed",
                extra={"error": str(e)},
                exc_info=True
            )
            raise

    async def analyze_single_profile(
        self,
        profile: Profile,
        job_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform comprehensive analysis of a single profile with enhanced validation.

        Args:
            profile: Profile to analyze
            job_requirements: Job requirements for matching

        Returns:
            Complete analysis results with confidence metrics

        Raises:
            ValueError: If profile validation fails
            RuntimeError: If analysis fails
        """
        # Generate cache key
        cache_key = f"{profile.id}:{hash(frozenset(job_requirements.items()))}"

        # Check cache first
        if cache_key in self._analysis_cache:
            self._logger.debug(
                "Returning cached analysis",
                extra={"profile_id": str(profile.id)}
            )
            return self._analysis_cache[cache_key]

        try:
            async with self._concurrency_limiter:
                # Perform AI analysis
                ai_analysis = await self._claude_client.analyze_profile(
                    profile.to_dict(),
                    job_requirements,
                    str(profile.id)
                )

                # Perform skill matching
                skill_analysis = self._skill_matcher.calculate_skill_match(
                    profile,
                    {
                        'required': job_requirements.get('required_skills', []),
                        'preferred': job_requirements.get('preferred_skills', [])
                    }
                )

                # Analyze skill gaps
                gap_analysis = self._skill_matcher.analyze_skill_gaps(
                    profile.get_all_skills(),
                    job_requirements
                )

                # Combine all analysis components
                combined_results = self.combine_analysis_results(
                    ai_analysis,
                    skill_analysis,
                    gap_analysis
                )

                # Validate confidence threshold
                if combined_results['confidence_score'] < MIN_CONFIDENCE_SCORE:
                    self._logger.warning(
                        "Low confidence analysis",
                        extra={
                            "profile_id": str(profile.id),
                            "confidence": combined_results['confidence_score']
                        }
                    )

                # Cache successful results
                self._analysis_cache[cache_key] = combined_results

                return combined_results

        except Exception as e:
            self._logger.error(
                "Profile analysis failed",
                extra={
                    "profile_id": str(profile.id),
                    "error": str(e)
                },
                exc_info=True
            )
            raise

    def combine_analysis_results(
        self,
        ai_analysis: Dict[str, Any],
        skill_analysis: Dict[str, Any],
        gap_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Combine and normalize different analysis components with enhanced validation.

        Args:
            ai_analysis: Results from Claude AI analysis
            skill_analysis: Results from skill matching
            gap_analysis: Results from gap analysis

        Returns:
            Combined analysis results with confidence metrics
        """
        # Calculate weighted scores
        ai_score = ai_analysis['match_score']
        skill_score = skill_analysis['overall_match_score']
        
        # Calculate combined confidence score
        confidence_score = min(
            ai_analysis['confidence_score'],
            skill_analysis['confidence_score']
        )

        # Prepare comprehensive results
        combined_results = {
            'overall_match_score': round((ai_score + skill_score) / 2, 2),
            'confidence_score': round(confidence_score, 2),
            'ai_analysis': {
                'score': round(ai_score, 2),
                'insights': ai_analysis.get('analysis', {}),
                'strengths': ai_analysis.get('strengths', []),
                'gaps': ai_analysis.get('gaps', [])
            },
            'skill_analysis': {
                'score': round(skill_score, 2),
                'matched_required': skill_analysis['match_details']['matched_required_skills'],
                'matched_preferred': skill_analysis['match_details']['matched_preferred_skills'],
                'missing_critical': skill_analysis['match_details']['missing_critical_skills']
            },
            'gap_analysis': {
                'skill_gaps': gap_analysis['missing_critical'],
                'recommendations': gap_analysis['recommendations'],
                'coverage': gap_analysis['coverage_percentage']
            },
            'metadata': {
                'timestamp': ai_analysis.get('timestamp'),
                'model_version': ai_analysis.get('model'),
                'processing_time': ai_analysis.get('processing_time')
            }
        }

        return combined_results