"""
Enterprise-grade search engine implementation for LinkedIn profile discovery and analysis
with advanced caching, rate limiting, and monitoring capabilities.

External Dependencies:
- asyncio==3.11+
- aioredis==2.0.0
- opentelemetry-api==1.20.0
- tenacity==8.2.0

Author: LinkedIn Profile Search System Team
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import aioredis
from opentelemetry import trace
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from .linkedin_client import LinkedInClient
from .profile_extractor import ProfileExtractor
from ..models.search_criteria import SearchCriteria
from ..utils.logger import get_logger

# Initialize tracer
tracer = trace.get_tracer(__name__)

# Initialize logger
logger = get_logger(__name__)

# Constants
CACHE_TTL = 3600  # Cache time-to-live in seconds
MAX_CONCURRENT_SEARCHES = 10  # Maximum concurrent search operations
MAX_PROFILES_PER_SEARCH = 1000  # Maximum profiles per search request
RETRY_CONFIG = {
    "stop": stop_after_attempt(3),
    "wait": wait_exponential(multiplier=1, min=4, max=10),
    "retry": retry_if_exception_type(Exception)
}

class SearchEngine:
    """
    Enterprise-grade search engine for LinkedIn profile discovery and processing
    with advanced caching, rate limiting, and monitoring capabilities.
    """

    def __init__(
        self,
        linkedin_client: LinkedInClient,
        cache_client: aioredis.Redis,
        metrics_collector: Any
    ):
        """
        Initialize search engine with dependencies and configuration.

        Args:
            linkedin_client (LinkedInClient): LinkedIn API client instance
            cache_client (aioredis.Redis): Redis cache client
            metrics_collector (Any): Metrics collection service
        """
        self._linkedin_client = linkedin_client
        self._cache = cache_client
        self._metrics = metrics_collector
        self._search_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SEARCHES)
        self._profile_extractor = None

    @trace.get_tracer(__name__).start_as_current_span("search_profiles")
    async def search_profiles(
        self,
        criteria: SearchCriteria,
        limit: Optional[int] = 100
    ) -> Dict[str, Any]:
        """
        Execute LinkedIn profile search with advanced features.

        Args:
            criteria (SearchCriteria): Search criteria model
            limit (Optional[int]): Maximum number of profiles to return

        Returns:
            Dict[str, Any]: Search results with profiles and metadata

        Raises:
            ValueError: If search criteria is invalid
            RuntimeError: If search operation fails
        """
        try:
            # Validate search criteria
            if not criteria.validate():
                raise ValueError("Invalid search criteria provided")

            # Enforce search limits
            enforced_limit = min(limit or MAX_PROFILES_PER_SEARCH, MAX_PROFILES_PER_SEARCH)

            # Generate cache key
            cache_key = self._generate_cache_key(criteria)

            # Check cache first
            cached_results = await self._get_cached_results(cache_key)
            if cached_results:
                logger.info(
                    "Returning cached search results",
                    extra={
                        "search_id": str(criteria.search_id),
                        "cache_hit": True
                    }
                )
                return cached_results

            # Acquire semaphore for rate limiting
            async with self._search_semaphore:
                # Execute search with retries
                search_results = await self._execute_search(criteria, enforced_limit)

                # Process and validate results
                processed_results = await self._process_search_results(search_results)

                # Cache results
                await self._cache_results(cache_key, processed_results)

                # Update metrics
                self._update_metrics(criteria, processed_results)

                logger.info(
                    "Search completed successfully",
                    extra={
                        "search_id": str(criteria.search_id),
                        "results_count": len(processed_results.get("profiles", []))
                    }
                )

                return processed_results

        except Exception as e:
            logger.error(
                "Search operation failed",
                extra={
                    "search_id": str(criteria.search_id),
                    "error": str(e)
                }
            )
            raise RuntimeError(f"Search operation failed: {str(e)}") from e

    async def _execute_search(
        self,
        criteria: SearchCriteria,
        limit: int
    ) -> Dict[str, Any]:
        """
        Execute LinkedIn API search with retry handling.

        Args:
            criteria (SearchCriteria): Search criteria
            limit (int): Maximum results to return

        Returns:
            Dict[str, Any]: Raw search results
        """
        search_params = self._build_search_params(criteria)
        
        try:
            results = await self._linkedin_client.search_profiles(
                search_criteria=search_params,
                limit=limit
            )
            return results
        except Exception as e:
            logger.error(
                "LinkedIn API search failed",
                extra={
                    "search_id": str(criteria.search_id),
                    "error": str(e)
                }
            )
            raise

    async def _process_search_results(
        self,
        raw_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process and validate raw search results.

        Args:
            raw_results (Dict[str, Any]): Raw search results

        Returns:
            Dict[str, Any]: Processed and validated results
        """
        processed_profiles = []
        
        for profile_data in raw_results.get("profiles", []):
            try:
                # Extract structured profile data
                extractor = ProfileExtractor(profile_data)
                profile = extractor.extract_profile()
                
                # Convert to search document format
                search_doc = profile.to_search_document()
                processed_profiles.append(search_doc)
                
            except Exception as e:
                logger.warning(
                    "Failed to process profile",
                    extra={"error": str(e)}
                )
                continue

        return {
            "profiles": processed_profiles,
            "total": raw_results.get("total", 0),
            "next_cursor": raw_results.get("next_cursor"),
            "processed_at": datetime.utcnow().isoformat()
        }

    def _build_search_params(self, criteria: SearchCriteria) -> Dict[str, Any]:
        """
        Build LinkedIn API search parameters from criteria.

        Args:
            criteria (SearchCriteria): Search criteria model

        Returns:
            Dict[str, Any]: API-compatible search parameters
        """
        return {
            "keywords": criteria.keywords,
            "location": {
                "country": criteria.location.country,
                "region": criteria.location.region,
                "city": criteria.location.city,
                "remote_only": criteria.location.remote_only
            },
            "experience": {
                "min_years": criteria.experience.min_years,
                "max_years": criteria.experience.max_years,
                "titles": criteria.experience.required_titles,
                "industries": criteria.experience.industries
            },
            "skills": {
                "required": criteria.required_skills,
                "preferred": criteria.preferred_skills
            },
            "certifications": criteria.certifications
        }

    def _generate_cache_key(self, criteria: SearchCriteria) -> str:
        """
        Generate secure cache key from search criteria.

        Args:
            criteria (SearchCriteria): Search criteria

        Returns:
            str: Cache key
        """
        criteria_dict = criteria.to_dict()
        # Remove timestamps and IDs for cache key generation
        criteria_dict.pop("created_at", None)
        criteria_dict.pop("updated_at", None)
        criteria_dict.pop("search_id", None)
        
        return f"search:{hash(json.dumps(criteria_dict, sort_keys=True))}"

    async def _get_cached_results(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached search results.

        Args:
            cache_key (str): Cache key

        Returns:
            Optional[Dict[str, Any]]: Cached results if available
        """
        try:
            cached_data = await self._cache.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
            return None
        except Exception as e:
            logger.warning(
                "Cache retrieval failed",
                extra={"error": str(e)}
            )
            return None

    async def _cache_results(
        self,
        cache_key: str,
        results: Dict[str, Any]
    ) -> None:
        """
        Cache search results with TTL.

        Args:
            cache_key (str): Cache key
            results (Dict[str, Any]): Results to cache
        """
        try:
            await self._cache.setex(
                cache_key,
                CACHE_TTL,
                json.dumps(results)
            )
        except Exception as e:
            logger.warning(
                "Failed to cache results",
                extra={"error": str(e)}
            )

    def _update_metrics(
        self,
        criteria: SearchCriteria,
        results: Dict[str, Any]
    ) -> None:
        """
        Update search metrics.

        Args:
            criteria (SearchCriteria): Search criteria
            results (Dict[str, Any]): Search results
        """
        try:
            self._metrics.increment(
                "search_executions_total",
                {
                    "search_id": str(criteria.search_id),
                    "template_name": criteria.template_name
                }
            )
            self._metrics.gauge(
                "search_results_count",
                len(results.get("profiles", [])),
                {
                    "search_id": str(criteria.search_id)
                }
            )
        except Exception as e:
            logger.warning(
                "Failed to update metrics",
                extra={"error": str(e)}
            )