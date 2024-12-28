"""
Pytest configuration file providing comprehensive test fixtures for the LinkedIn Profile Search service.
Includes mocked services, test data, and utilities for both unit and integration testing.

External Dependencies:
- pytest==7.0.0
- pytest-asyncio==0.21.0
- pytest-mock==3.10.0
- aiohttp==3.8.0
- faker==19.3.0
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import uuid4

import pytest
from aiohttp import ClientSession
from faker import Faker
from pytest_mock import MockerFixture

from ..src.core.linkedin_client import LinkedInClient
from ..src.core.search_engine import SearchEngine
from ..src.models.search_criteria import SearchCriteria, LocationCriteria, ExperienceCriteria

# Initialize faker for generating test data
fake = Faker()

# Test data constants
MOCK_PROFILE_DATA = {
    'id': 'mock-profile-1',
    'url': 'https://www.linkedin.com/in/mock-profile',
    'name': 'John Doe',
    'title': 'Senior Software Engineer',
    'company': 'Tech Corp',
    'location': 'San Francisco, CA',
    'experience': [
        {
            'title': 'Senior Software Engineer',
            'company': 'Tech Corp',
            'duration': '2020-present',
            'description': 'Led development of cloud-native applications'
        },
        {
            'title': 'Software Engineer',
            'company': 'StartUp Inc',
            'duration': '2018-2020',
            'description': 'Full stack development'
        }
    ],
    'skills': ['Python', 'Java', 'AWS', 'Kubernetes', 'React'],
    'education': [
        {
            'degree': 'M.S. Computer Science',
            'school': 'Stanford University',
            'year': '2018'
        }
    ],
    'certifications': [
        {
            'name': 'AWS Certified Solutions Architect',
            'issuer': 'Amazon Web Services',
            'year': '2021'
        }
    ]
}

MOCK_SEARCH_CRITERIA = {
    'keywords': ['Python Developer', 'Software Engineer'],
    'location': {
        'city': 'San Francisco',
        'state': 'CA',
        'country': 'US',
        'remote': True
    },
    'experience': {
        'min_years': 5,
        'max_years': 10,
        'required_skills': ['Python', 'AWS'],
        'preferred_skills': ['Kubernetes', 'React']
    },
    'education': {
        'degree_level': ["Bachelor's", "Master's"],
        'fields': ['Computer Science', 'Software Engineering']
    }
}

@pytest.fixture(scope='session')
async def event_loop():
    """
    Create and provide an event loop for async tests.
    
    Returns:
        asyncio.AbstractEventLoop: Event loop instance
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    await asyncio.gather(*asyncio.all_tasks(loop))
    loop.close()

@pytest.fixture
async def async_client_session(event_loop):
    """
    Provide an aiohttp ClientSession with retry and timeout configuration.
    
    Args:
        event_loop: Event loop fixture
        
    Returns:
        aiohttp.ClientSession: Configured client session
    """
    async with ClientSession(
        timeout=ClientSession.timeout_class(total=30),
        raise_for_status=True
    ) as session:
        yield session

@pytest.fixture
def mock_linkedin_client(mocker: MockerFixture, async_client_session):
    """
    Provide a mocked LinkedIn client with rate limiting and error simulation.
    
    Args:
        mocker: pytest-mock fixture
        async_client_session: Async HTTP client session
        
    Returns:
        MagicMock: Mocked LinkedInClient instance
    """
    client_mock = mocker.Mock(spec=LinkedInClient)
    
    # Configure search_profiles mock with rate limiting
    async def mock_search_profiles(search_criteria: Dict[str, Any], limit: Optional[int] = None):
        # Simulate rate limiting
        if getattr(mock_search_profiles, 'call_count', 0) > 5:
            raise Exception("Rate limit exceeded")
            
        mock_search_profiles.call_count = getattr(mock_search_profiles, 'call_count', 0) + 1
        
        return {
            'profiles': [MOCK_PROFILE_DATA],
            'total': 1,
            'next_cursor': None
        }
    
    client_mock.search_profiles = mock_search_profiles
    
    # Configure profile validation
    async def mock_validate_credentials():
        return True
        
    client_mock.validate_credentials = mock_validate_credentials
    
    return client_mock

@pytest.fixture
def mock_search_engine(mocker: MockerFixture, mock_linkedin_client):
    """
    Provide a mocked search engine with caching and concurrent search support.
    
    Args:
        mocker: pytest-mock fixture
        mock_linkedin_client: Mocked LinkedIn client
        
    Returns:
        MagicMock: Mocked SearchEngine instance
    """
    engine_mock = mocker.Mock(spec=SearchEngine)
    
    # Configure cache simulation
    cache = {}
    
    async def mock_search_profiles(criteria: SearchCriteria, limit: Optional[int] = None):
        cache_key = f"search:{hash(json.dumps(criteria.to_dict(), sort_keys=True))}"
        
        # Check cache
        if cache_key in cache:
            return cache[cache_key]
            
        # Simulate search
        results = {
            'profiles': [MOCK_PROFILE_DATA],
            'total': 1,
            'next_cursor': None,
            'processed_at': datetime.now().isoformat()
        }
        
        # Cache results
        cache[cache_key] = results
        return results
        
    engine_mock.search_profiles = mock_search_profiles
    
    # Configure cache operations
    async def mock_cache_profile(profile_id: str, profile_data: Dict[str, Any]):
        cache[f"profile:{profile_id}"] = profile_data
        
    engine_mock.cache_profile = mock_cache_profile
    
    return engine_mock

@pytest.fixture
def mock_search_criteria():
    """
    Provide a valid SearchCriteria instance for testing.
    
    Returns:
        SearchCriteria: Test search criteria
    """
    return SearchCriteria(
        search_id=uuid4(),
        template_name="Software Engineer Search",
        keywords="python AND (aws OR gcp)",
        location=LocationCriteria(
            location="San Francisco Bay Area",
            country="US",
            region="CA",
            city="San Francisco",
            remote_only=True
        ),
        experience=ExperienceCriteria(
            min_years=3,
            max_years=8,
            required_titles=["Software Engineer", "Senior Software Engineer"],
            industries=["Technology", "Software"]
        ),
        required_skills=["Python", "AWS", "Kubernetes"],
        preferred_skills=["React", "Node.js"],
        certifications=["AWS Certified Solutions Architect"],
        created_at=datetime.now(),
        is_active=True
    )

@pytest.fixture
def mock_profile_data():
    """
    Provide realistic test profile data.
    
    Returns:
        Dict[str, Any]: Test profile data
    """
    return MOCK_PROFILE_DATA

@pytest.fixture
def mock_rate_limit_error():
    """
    Provide a simulated rate limit error response.
    
    Returns:
        Exception: Rate limit error
    """
    return Exception("LinkedIn API rate limit exceeded. Try again in 3600 seconds.")