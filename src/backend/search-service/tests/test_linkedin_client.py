"""
Comprehensive test suite for LinkedIn API client implementation.
Tests profile search, data extraction, rate limiting, security features, and error handling.

External Dependencies:
- pytest==7.0.0
- pytest-asyncio==0.21.0
- pytest-mock==3.10.0
- aiohttp==3.8.0
- freezegun==1.2.0
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from freezegun import freeze_time
from aiohttp import ClientError, ClientResponse, ClientSession

from ..src.core.linkedin_client import LinkedInClient
from ..src.models.profile import Profile

# Test configuration
MOCK_API_CONFIG = {
    "api_key": "test-api-key",
    "api_secret": "test-api-secret",
    "base_url": "https://api.linkedin.com/v2",
    "rate_limit": {
        "requests_per_second": 5,
        "burst_size": 10,
        "backoff_factor": 1.5
    },
    "retry_config": {
        "max_retries": 3,
        "initial_delay": 1.0,
        "max_delay": 5.0
    },
    "circuit_breaker": {
        "failure_threshold": 5,
        "reset_timeout": 30
    }
}

# Sample test data
SAMPLE_PROFILE_DATA = {
    "profile_id": "test-profile-123",
    "first_name": "John",
    "last_name": "Doe",
    "headline": "Senior Software Engineer",
    "industry": "Technology",
    "location": "San Francisco Bay Area",
    "experience": [],
    "skills": []
}

@pytest.fixture
async def mock_session():
    """Fixture for mocked aiohttp session."""
    session = AsyncMock(spec=ClientSession)
    response = AsyncMock(spec=ClientResponse)
    response.status = 200
    response.json.return_value = {"elements": [SAMPLE_PROFILE_DATA]}
    session.get.return_value.__aenter__.return_value = response
    return session

@pytest.fixture
def mock_rate_limiter():
    """Fixture for mocked rate limiter."""
    return Mock(check_rate_limit=AsyncMock(return_value=True))

class TestLinkedInClient:
    """Comprehensive test suite for LinkedIn API client."""

    @pytest.mark.asyncio
    async def test_client_initialization(self):
        """Test client initialization with security and configuration validation."""
        client = LinkedInClient(config=MOCK_API_CONFIG)
        
        # Verify API credentials are securely stored
        assert hasattr(client, "_config")
        assert client._config["api_key"] == "test-api-key"
        assert client._config["api_secret"] == "test-api-secret"
        
        # Verify rate limiter initialization
        assert hasattr(client, "_rate_limit_state")
        assert client._rate_limit_state["tokens"] == MOCK_API_CONFIG["rate_limit"]["requests_per_second"]
        
        # Verify circuit breaker configuration
        assert hasattr(client, "_circuit_breaker")
        assert client._circuit_breaker.failure_threshold == 5
        assert client._circuit_breaker.reset_timeout == 30

    @pytest.mark.asyncio
    async def test_session_initialization(self, mock_session):
        """Test secure session initialization with proper SSL/TLS settings."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            # Verify secure headers
            headers = client._session.headers
            assert "Authorization" in headers
            assert headers["Content-Type"] == "application/json"
            assert headers["X-Restli-Protocol-Version"] == "2.0.0"

    @pytest.mark.asyncio
    async def test_search_profiles_success(self, mock_session):
        """Test successful profile search with response validation."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            search_criteria = {"keywords": "python developer"}
            result = await client.search_profiles(search_criteria, limit=10)
            
            # Verify search results
            assert "profiles" in result
            assert "total" in result
            assert "next_cursor" in result
            assert len(result["profiles"]) > 0
            
            # Verify profile data transformation
            profile = result["profiles"][0]
            assert "profile_id" in profile
            assert "first_name" in profile
            assert "last_name" in profile

    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, mock_session):
        """Test rate limit handling and backoff strategies."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            # Exhaust rate limit
            for _ in range(MOCK_API_CONFIG["rate_limit"]["requests_per_second"] + 1):
                await client._check_rate_limit("search")
            
            # Verify rate limit enforcement
            assert client._rate_limit_state["tokens"] < 1
            
            # Test backoff behavior
            with pytest.raises(ClientError, match="Rate limit exceeded"):
                await client.search_profiles({"keywords": "test"})

    @pytest.mark.asyncio
    @freeze_time("2023-01-01 00:00:00")
    async def test_rate_limit_token_refresh(self, mock_session):
        """Test rate limit token refresh mechanism."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            # Use all tokens
            initial_tokens = client._rate_limit_state["tokens"]
            for _ in range(int(initial_tokens)):
                assert await client._check_rate_limit("search")
            
            # Advance time and verify token refresh
            with freeze_time("2023-01-01 00:00:01"):
                new_tokens = client._rate_limit_state["tokens"]
                assert new_tokens > 0
                assert await client._check_rate_limit("search")

    @pytest.mark.asyncio
    async def test_error_handling(self, mock_session):
        """Test comprehensive error handling scenarios."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            # Test invalid search criteria
            with pytest.raises(ValueError, match="Search criteria cannot be empty"):
                await client.search_profiles({})
            
            # Test API error handling
            mock_session.get.return_value.__aenter__.return_value.status = 500
            with pytest.raises(ClientError):
                await client.search_profiles({"keywords": "test"})
            
            # Test circuit breaker triggering
            for _ in range(MOCK_API_CONFIG["circuit_breaker"]["failure_threshold"] + 1):
                with pytest.raises(ClientError):
                    await client.search_profiles({"keywords": "test"})

    @pytest.mark.asyncio
    async def test_profile_transformation(self, mock_session):
        """Test profile data transformation and validation."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            # Mock profile response
            mock_session.get.return_value.__aenter__.return_value.json.return_value = {
                "elements": [SAMPLE_PROFILE_DATA]
            }
            
            result = await client.search_profiles({"keywords": "test"})
            profile = result["profiles"][0]
            
            # Verify profile structure
            assert profile["profile_id"] == SAMPLE_PROFILE_DATA["profile_id"]
            assert profile["first_name"] == SAMPLE_PROFILE_DATA["first_name"]
            assert profile["last_name"] == SAMPLE_PROFILE_DATA["last_name"]
            assert profile["headline"] == SAMPLE_PROFILE_DATA["headline"]

    @pytest.mark.asyncio
    async def test_context_manager(self, mock_session):
        """Test async context manager implementation."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with LinkedInClient(config=MOCK_API_CONFIG) as client:
                assert not client._session.closed
                await client.search_profiles({"keywords": "test"})
            
            # Verify session cleanup
            assert client._session.closed

    @pytest.mark.asyncio
    async def test_retry_mechanism(self, mock_session):
        """Test retry mechanism with exponential backoff."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            client = LinkedInClient(config=MOCK_API_CONFIG)
            await client._init_session()
            
            # Mock temporary failures
            mock_session.get.return_value.__aenter__.side_effect = [
                ClientError(),  # First attempt fails
                ClientError(),  # Second attempt fails
                AsyncMock(spec=ClientResponse,  # Third attempt succeeds
                         status=200,
                         json=AsyncMock(return_value={"elements": [SAMPLE_PROFILE_DATA]}))
            ]
            
            # Verify successful retry
            result = await client.search_profiles({"keywords": "test"})
            assert len(result["profiles"]) > 0
            assert mock_session.get.call_count == 3