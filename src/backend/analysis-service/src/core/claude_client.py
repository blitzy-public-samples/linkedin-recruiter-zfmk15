"""
Claude AI client implementation for intelligent profile analysis.

This module provides an enterprise-grade async client for interacting with the Claude AI API,
implementing robust error handling, rate limiting, retries, and comprehensive monitoring.

Version: 1.0.0
"""

import asyncio
import json
from typing import Dict, Any, Optional
from datetime import datetime
import aiohttp  # version: 3.8+
from aiohttp import ClientTimeout, ClientSession
from aiohttp_retry import RetryClient, ExponentialRetry  # version: 2.8+
from tenacity import (  # version: 8.2+
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from ..config.claude_config import ClaudeConfig
from ..utils.logger import get_logger, get_correlation_id

# Configure module logger
logger = get_logger(__name__)

# Client configuration constants
DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3
RATE_LIMIT_DELAY = 0.1
BACKOFF_MULTIPLIER = 2.0
MAX_CONCURRENT_REQUESTS = 10

class ClaudeClient:
    """
    Async client for Claude AI API with enterprise features including rate limiting,
    retry handling, monitoring, and secure communication.
    """

    def __init__(self, config: ClaudeConfig):
        """
        Initialize Claude client with enhanced configuration and monitoring.

        Args:
            config: Validated Claude configuration instance
        """
        self.config = config
        self._metrics: Dict[str, Any] = {
            'requests_total': 0,
            'requests_failed': 0,
            'average_latency': 0.0,
            'last_error': None
        }

        # Configure timeout and session
        timeout = ClientTimeout(total=self.config.timeout)
        self._session = ClientSession(timeout=timeout)

        # Configure retry strategy
        retry_options = ExponentialRetry(
            attempts=self.config.max_retries,
            start_timeout=1,
            max_timeout=20,
            factor=BACKOFF_MULTIPLIER
        )
        self._retry_client = RetryClient(
            client_session=self._session,
            retry_options=retry_options
        )

        # Configure rate limiting
        self._rate_limiter = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

        logger.info(
            "Claude client initialized",
            extra={
                'api_url': str(self.config.api_url),
                'model': self.config.model_name,
                'max_retries': self.config.max_retries,
                'timeout': self.config.timeout
            }
        )

    async def analyze_profile(
        self,
        profile_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        correlation_id: str
    ) -> Dict[str, Any]:
        """
        Analyze LinkedIn profile using Claude AI with comprehensive error handling.

        Args:
            profile_data: LinkedIn profile information
            job_requirements: Job requirements for analysis
            correlation_id: Request correlation ID for tracking

        Returns:
            Dict containing analysis results with scores and confidence metrics

        Raises:
            ValueError: If input data is invalid
            RuntimeError: If API communication fails
        """
        start_time = datetime.now()

        try:
            # Validate inputs
            if not profile_data or not job_requirements:
                raise ValueError("Profile data and job requirements are required")

            # Prepare analysis request
            prompt = await self._prepare_analysis_prompt(profile_data, job_requirements)
            request_id = f"req_{correlation_id}"

            async with self._rate_limiter:
                # Make API request with retry handling
                response = await self._make_api_request(prompt, request_id)

                # Process and validate response
                analysis_results = await self._process_response(response)

                # Enrich results with metadata
                analysis_results.update({
                    'request_id': request_id,
                    'model': self.config.model_name,
                    'timestamp': datetime.now().isoformat(),
                    'processing_time': (datetime.now() - start_time).total_seconds()
                })

                # Update metrics
                self._update_metrics(start_time, success=True)

                logger.info(
                    "Profile analysis completed",
                    extra={
                        'correlation_id': correlation_id,
                        'request_id': request_id,
                        'processing_time': analysis_results['processing_time']
                    }
                )

                return analysis_results

        except Exception as e:
            self._update_metrics(start_time, success=False, error=str(e))
            logger.error(
                "Profile analysis failed",
                extra={
                    'correlation_id': correlation_id,
                    'error': str(e)
                },
                exc_info=True
            )
            raise

    async def _prepare_analysis_prompt(
        self,
        profile_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> str:
        """
        Prepare detailed analysis prompt with context and instructions.

        Args:
            profile_data: LinkedIn profile information
            job_requirements: Job requirements for analysis

        Returns:
            Formatted prompt string for Claude API
        """
        # Format profile information
        profile_text = json.dumps({
            'experience': profile_data.get('experience', []),
            'skills': profile_data.get('skills', []),
            'education': profile_data.get('education', []),
            'certifications': profile_data.get('certifications', [])
        }, indent=2)

        # Format job requirements
        requirements_text = json.dumps({
            'required_skills': job_requirements.get('required_skills', []),
            'experience_level': job_requirements.get('experience_level', ''),
            'role_type': job_requirements.get('role_type', ''),
            'industry': job_requirements.get('industry', '')
        }, indent=2)

        # Construct analysis prompt
        prompt = f"""
        Analyze the following LinkedIn profile for job fit:

        Profile Information:
        {profile_text}

        Job Requirements:
        {requirements_text}

        Please provide:
        1. Overall match score (0-100)
        2. Skill match analysis
        3. Experience relevance
        4. Key strengths and gaps
        5. Confidence score for this analysis

        Format the response as JSON with the following structure:
        {{
            "match_score": number,
            "skill_analysis": object,
            "experience_analysis": object,
            "strengths": array,
            "gaps": array,
            "confidence_score": number
        }}
        """

        return prompt

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=BACKOFF_MULTIPLIER),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError))
    )
    async def _make_api_request(
        self,
        prompt: str,
        request_id: str
    ) -> Dict[str, Any]:
        """
        Make rate-limited API request to Claude with retry handling.

        Args:
            prompt: Analysis prompt
            request_id: Unique request identifier

        Returns:
            Raw API response

        Raises:
            RuntimeError: If API request fails after retries
        """
        headers = {
            'Authorization': f"Bearer {self.config.api_key.get_secret_value()}",
            'Content-Type': 'application/json',
            'X-Request-ID': request_id
        }

        payload = {
            'model': self.config.model_name,
            'prompt': prompt,
            'max_tokens': 2000,
            'temperature': 0.3,
            'stream': False
        }

        try:
            async with self._retry_client.post(
                f"{self.config.api_url}/v1/complete",
                json=payload,
                headers=headers
            ) as response:
                if response.status != 200:
                    raise RuntimeError(
                        f"API request failed with status {response.status}"
                    )
                return await response.json()

        except Exception as e:
            logger.error(
                "API request failed",
                extra={
                    'request_id': request_id,
                    'error': str(e)
                },
                exc_info=True
            )
            raise

    async def _process_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and validate Claude API response.

        Args:
            response: Raw API response

        Returns:
            Processed analysis results

        Raises:
            ValueError: If response format is invalid
        """
        try:
            completion = response.get('completion', '')
            if not completion:
                raise ValueError("Empty response from API")

            # Parse structured data from completion
            analysis_results = json.loads(completion)

            # Validate required fields
            required_fields = {
                'match_score', 'skill_analysis', 'experience_analysis',
                'strengths', 'gaps', 'confidence_score'
            }
            if not all(field in analysis_results for field in required_fields):
                raise ValueError("Invalid response format")

            # Normalize scores to 0-100 range
            analysis_results['match_score'] = min(100, max(0, analysis_results['match_score']))
            analysis_results['confidence_score'] = min(100, max(0, analysis_results['confidence_score']))

            return analysis_results

        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse API response",
                extra={'error': str(e)},
                exc_info=True
            )
            raise ValueError("Invalid response format") from e

    def _update_metrics(
        self,
        start_time: datetime,
        success: bool,
        error: Optional[str] = None
    ) -> None:
        """
        Update client metrics for monitoring.

        Args:
            start_time: Request start time
            success: Whether request succeeded
            error: Error message if failed
        """
        self._metrics['requests_total'] += 1
        if not success:
            self._metrics['requests_failed'] += 1
            self._metrics['last_error'] = error

        duration = (datetime.now() - start_time).total_seconds()
        self._metrics['average_latency'] = (
            (self._metrics['average_latency'] * (self._metrics['requests_total'] - 1) + duration)
            / self._metrics['requests_total']
        )

    async def close(self) -> None:
        """Clean up client resources."""
        await self._session.close()