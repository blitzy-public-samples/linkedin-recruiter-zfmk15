"""
Comprehensive test suite for LinkedIn profile search engine implementation.
Tests core functionality, caching, rate limiting, security, and load testing scenarios.

External Dependencies:
- pytest==7.0.0
- pytest-asyncio==0.21.0
- pytest-mock==3.10.0
- aioredis==2.0.0
- locust==2.15.0
- prometheus_client==0.17.0
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List
import aioredis
from prometheus_client import Counter, Histogram
from locust import HttpUser, task, between

from ..src.core.search_engine import SearchEngine
from ..src.models.search_criteria import SearchCriteria, LocationCriteria, ExperienceCriteria
from ..src.core.linkedin_client import LinkedInClient

# Test fixtures
@pytest.fixture
async def redis_client():
    """Initialize Redis client for testing."""
    client = await aioredis.from_url("redis://localhost:6379/0")
    yield client
    await client.close()

@pytest.fixture
def metrics_client():
    """Initialize metrics client for testing."""
    return {
        'search_executions': Counter('test_search_executions', 'Search executions'),
        'search_latency': Histogram('test_search_latency', 'Search latency')
    }

@pytest.fixture
def sample_search_criteria():
    """Create sample search criteria for testing."""
    return SearchCriteria(
        search_id=uuid.uuid4(),
        template_name="Senior Developer Search",
        keywords="python AND (aws OR gcp)",
        location=LocationCriteria(
            location="San Francisco",
            country="US",
            region="CA",
            remote_only=True
        ),
        experience=ExperienceCriteria(
            min_years=5,
            max_years=10,
            required_titles=["Senior Software Engineer", "Tech Lead"]
        ),
        required_skills=["Python", "AWS", "Kubernetes"],
        preferred_skills=["React", "GraphQL"],
        certifications=["AWS Certified Solutions Architect"]
    )

@pytest.fixture
async def mock_search_engine(redis_client, metrics_client):
    """Initialize SearchEngine with mocked dependencies."""
    linkedin_client = LinkedInClient()
    engine = SearchEngine(linkedin_client, redis_client, metrics_client)
    yield engine
    await engine.close()

class TestSearchEngine:
    """Comprehensive test suite for SearchEngine functionality."""

    @pytest.mark.asyncio
    async def test_search_profiles_success(
        self,
        mock_search_engine: SearchEngine,
        sample_search_criteria: SearchCriteria,
        mocker
    ):
        """Test successful profile search with various criteria combinations."""
        # Mock LinkedIn API response
        mock_profiles = [
            {
                "id": str(uuid.uuid4()),
                "full_name": "John Doe",
                "headline": "Senior Software Engineer",
                "location": "San Francisco, CA",
                "experience": [
                    {
                        "title": "Senior Software Engineer",
                        "company": "Tech Corp",
                        "duration": "5 years"
                    }
                ]
            }
        ]
        
        mocker.patch.object(
            mock_search_engine._linkedin_client,
            'search_profiles',
            return_value={"profiles": mock_profiles, "total": 1}
        )

        # Execute search
        results = await mock_search_engine.search_profiles(
            criteria=sample_search_criteria,
            limit=10
        )

        # Verify results structure
        assert isinstance(results, dict)
        assert "profiles" in results
        assert "total" in results
        assert len(results["profiles"]) == 1

        # Verify profile data
        profile = results["profiles"][0]
        assert "id" in profile
        assert "full_name" in profile
        assert "headline" in profile
        assert "location" in profile

        # Verify metrics collection
        assert mock_search_engine._metrics['search_executions']._value == 1

    @pytest.mark.asyncio
    async def test_search_profiles_cache(
        self,
        mock_search_engine: SearchEngine,
        redis_client: aioredis.Redis,
        sample_search_criteria: SearchCriteria,
        mocker
    ):
        """Test Redis cache integration and behavior."""
        # Clear cache
        await redis_client.flushdb()

        # Mock search results
        mock_results = {
            "profiles": [
                {
                    "id": str(uuid.uuid4()),
                    "full_name": "Jane Smith",
                    "skills": ["Python", "AWS"]
                }
            ],
            "total": 1
        }

        mocker.patch.object(
            mock_search_engine._linkedin_client,
            'search_profiles',
            return_value=mock_results
        )

        # First search - should hit LinkedIn API
        results1 = await mock_search_engine.search_profiles(
            criteria=sample_search_criteria,
            limit=10
        )

        # Second search - should hit cache
        results2 = await mock_search_engine.search_profiles(
            criteria=sample_search_criteria,
            limit=10
        )

        # Verify cache hit
        assert results1 == results2
        assert mock_search_engine._linkedin_client.search_profiles.call_count == 1

        # Verify cache expiration
        cache_key = mock_search_engine._generate_cache_key(sample_search_criteria)
        ttl = await redis_client.ttl(cache_key)
        assert ttl > 0

    @pytest.mark.asyncio
    async def test_search_security(
        self,
        mock_search_engine: SearchEngine,
        sample_search_criteria: SearchCriteria
    ):
        """Test search security validations and sanitization."""
        # Test invalid criteria
        with pytest.raises(ValueError):
            invalid_criteria = sample_search_criteria
            invalid_criteria.keywords = "<script>alert('xss')</script>"
            await mock_search_engine.search_profiles(invalid_criteria)

        # Test missing required fields
        with pytest.raises(ValueError):
            invalid_criteria = sample_search_criteria
            invalid_criteria.required_skills = []
            await mock_search_engine.search_profiles(invalid_criteria)

        # Test excessive limits
        results = await mock_search_engine.search_profiles(
            criteria=sample_search_criteria,
            limit=9999
        )
        assert len(results["profiles"]) <= 1000  # Max limit enforced

    @pytest.mark.asyncio
    @pytest.mark.load_test
    async def test_search_load(
        self,
        mock_search_engine: SearchEngine,
        sample_search_criteria: SearchCriteria
    ):
        """Load test search functionality for volume requirements."""
        # Configure concurrent searches
        num_concurrent = 50
        searches_per_batch = 200

        async def execute_search():
            try:
                return await mock_search_engine.search_profiles(
                    criteria=sample_search_criteria,
                    limit=10
                )
            except Exception as e:
                return {"error": str(e)}

        # Execute concurrent searches
        tasks = []
        for _ in range(searches_per_batch):
            tasks.append(asyncio.create_task(execute_search()))

        results = await asyncio.gather(*tasks)

        # Verify results
        success_count = len([r for r in results if "error" not in r])
        error_count = len([r for r in results if "error" in r])

        # Assert performance metrics
        assert success_count >= searches_per_batch * 0.95  # 95% success rate
        assert error_count <= searches_per_batch * 0.05   # 5% error tolerance

    @pytest.mark.asyncio
    async def test_search_rate_limiting(
        self,
        mock_search_engine: SearchEngine,
        sample_search_criteria: SearchCriteria
    ):
        """Test rate limiting behavior."""
        # Execute searches up to rate limit
        results = []
        for _ in range(105):  # Slightly over rate limit
            try:
                result = await mock_search_engine.search_profiles(
                    criteria=sample_search_criteria,
                    limit=10
                )
                results.append(result)
            except Exception as e:
                assert "Rate limit exceeded" in str(e)
                break

        # Verify rate limiting
        assert len(results) <= 100  # Rate limit enforced

    def test_cache_key_generation(
        self,
        mock_search_engine: SearchEngine,
        sample_search_criteria: SearchCriteria
    ):
        """Test cache key generation consistency."""
        # Generate keys for same criteria
        key1 = mock_search_engine._generate_cache_key(sample_search_criteria)
        key2 = mock_search_engine._generate_cache_key(sample_search_criteria)
        assert key1 == key2

        # Modify criteria and verify key changes
        modified_criteria = sample_search_criteria
        modified_criteria.keywords = "modified search"
        key3 = mock_search_engine._generate_cache_key(modified_criteria)
        assert key1 != key3

class SearchLoadTest(HttpUser):
    """Load testing class for search API."""
    
    wait_time = between(1, 2)

    @task
    def search_profiles(self):
        """Execute search load test."""
        self.client.post("/api/v1/search", json={
            "keywords": "python developer",
            "location": "San Francisco",
            "limit": 10
        })