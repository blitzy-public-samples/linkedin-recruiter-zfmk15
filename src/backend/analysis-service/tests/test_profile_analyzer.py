"""
Comprehensive test suite for the ProfileAnalyzer class that validates profile analysis 
functionality including experience matching, skill analysis, and AI-powered evaluation.

Version: 1.0.0
"""

import pytest
import pytest_asyncio  # version: 0.21.0
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta
import uuid
from typing import Dict, Any

from ..src.core.profile_analyzer import ProfileAnalyzer, MIN_MATCH_SCORE
from ..src.models.profile import Profile, ProfileExperience, ProfileEducation

# Test Constants
MOCK_PROFILE_ID = uuid.uuid4()
MOCK_LINKEDIN_URL = "https://linkedin.com/in/test-user"
CURRENT_DATE = datetime.now()
PAST_DATE = CURRENT_DATE - timedelta(days=365*3)  # 3 years ago

@pytest.fixture
def mock_claude_client():
    """Fixture for mocked Claude AI client."""
    client = AsyncMock()
    client.analyze_profile = AsyncMock(return_value={
        'match_score': 0.85,
        'analysis': 'Strong technical background',
        'strengths': ['Python', 'AWS'],
        'gaps': ['Kubernetes'],
        'confidence_score': 0.92,
        'timestamp': CURRENT_DATE.isoformat(),
        'model': 'claude-2',
        'processing_time': 0.5
    })
    return client

@pytest.fixture
def mock_skill_matcher():
    """Fixture for mocked skill matcher."""
    matcher = MagicMock()
    matcher.calculate_skill_match.return_value = {
        'overall_match_score': 0.80,
        'required_skills_score': 0.90,
        'preferred_skills_score': 0.70,
        'confidence_score': 0.85,
        'gap_analysis': {
            'matched_required': ['Python', 'AWS'],
            'matched_preferred': ['Java'],
            'missing_critical': ['Kubernetes'],
            'missing_preferred': ['Docker'],
            'coverage_percentage': {
                'required': 90.0,
                'preferred': 70.0
            },
            'recommendations': []
        }
    }
    return matcher

@pytest.fixture
def mock_cache():
    """Fixture for mocked cache."""
    return MagicMock()

@pytest.fixture
def sample_profile() -> Profile:
    """Fixture for sample profile data."""
    return Profile(
        id=MOCK_PROFILE_ID,
        linkedin_url=MOCK_LINKEDIN_URL,
        full_name="Test User",
        headline="Senior Software Engineer",
        experience=[
            ProfileExperience(
                company_name="Tech Corp",
                title="Senior Developer",
                description="Full stack development",
                start_date=PAST_DATE,
                end_date=CURRENT_DATE,
                skills=["Python", "AWS", "Java"]
            )
        ],
        education=[
            ProfileEducation(
                institution="Test University",
                degree="Bachelor's in Computer Science",
                start_date=PAST_DATE - timedelta(days=365*4),
                end_date=PAST_DATE
            )
        ],
        skills=["Python", "AWS", "Java", "JavaScript"],
        certifications=["AWS Certified Developer"]
    )

@pytest.fixture
def job_requirements() -> Dict[str, Any]:
    """Fixture for job requirements."""
    return {
        'required_skills': ['Python', 'AWS', 'Kubernetes'],
        'preferred_skills': ['Docker', 'Java'],
        'min_experience': 36,  # 3 years
        'role_level': 'Senior',
        'role_type': 'Software Engineer'
    }

@pytest.fixture
def profile_analyzer(mock_claude_client, mock_skill_matcher, mock_cache):
    """Fixture for ProfileAnalyzer instance."""
    return ProfileAnalyzer(
        claude_client=mock_claude_client,
        skill_matcher=mock_skill_matcher,
        cache=mock_cache
    )

def test_profile_analyzer_initialization(profile_analyzer):
    """Test successful initialization of ProfileAnalyzer."""
    assert profile_analyzer._claude_client is not None
    assert profile_analyzer._skill_matcher is not None
    assert profile_analyzer._analysis_cache is not None
    assert profile_analyzer._logger is not None

@pytest.mark.asyncio
async def test_analyze_profile_success(profile_analyzer, sample_profile, job_requirements):
    """Test successful profile analysis with all components."""
    # Execute analysis
    result = await profile_analyzer.analyze_profile(sample_profile, job_requirements)
    
    # Verify overall structure
    assert isinstance(result, dict)
    assert 'profile_id' in result
    assert 'overall_match_score' in result
    assert 'confidence_score' in result
    
    # Verify scores are within valid range
    assert 0 <= result['overall_match_score'] <= 100
    assert 0 <= result['confidence_score'] <= 100
    
    # Verify experience analysis
    assert 'experience_analysis' in result
    assert result['experience_analysis']['total_months'] == 36
    assert result['experience_analysis']['meets_requirements'] is True
    
    # Verify skill analysis
    assert 'skill_analysis' in result
    assert isinstance(result['skill_analysis']['matched_required'], list)
    assert isinstance(result['skill_analysis']['missing_critical'], list)
    assert 'score' in result['skill_analysis']
    
    # Verify AI insights
    assert 'ai_insights' in result
    assert 'analysis' in result['ai_insights']
    assert 'key_strengths' in result['ai_insights']
    assert 'improvement_areas' in result['ai_insights']
    
    # Verify metadata
    assert 'metadata' in result
    assert 'timestamp' in result['metadata']
    assert 'model_version' in result['metadata']
    assert 'processing_time' in result['metadata']

@pytest.mark.asyncio
async def test_analyze_profile_with_cache(profile_analyzer, sample_profile, job_requirements):
    """Test profile analysis with caching."""
    # First call should cache the result
    result1 = await profile_analyzer.analyze_profile(sample_profile, job_requirements)
    
    # Second call should return cached result
    result2 = await profile_analyzer.analyze_profile(sample_profile, job_requirements)
    
    assert result1 == result2
    profile_analyzer._analysis_cache.get.assert_called_once()

@pytest.mark.asyncio
async def test_analyze_profile_invalid_data(profile_analyzer):
    """Test profile analysis with invalid data."""
    with pytest.raises(ValueError):
        await profile_analyzer.analyze_profile(None, {})

@pytest.mark.asyncio
async def test_analyze_profile_missing_requirements(profile_analyzer, sample_profile):
    """Test profile analysis with missing job requirements."""
    with pytest.raises(ValueError):
        await profile_analyzer.analyze_profile(sample_profile, {})

def test_calculate_experience_match(profile_analyzer):
    """Test experience match calculation."""
    # Test exact match
    score = profile_analyzer._calculate_experience_match(36, 36)
    assert score == 1.0
    
    # Test under-qualified
    score = profile_analyzer._calculate_experience_match(24, 36)
    assert score < 1.0
    assert score >= MIN_MATCH_SCORE
    
    # Test over-qualified
    score = profile_analyzer._calculate_experience_match(60, 36, 48)
    assert score < 1.0
    assert score >= 0.7

@pytest.mark.asyncio
async def test_analyze_profile_ai_failure(profile_analyzer, sample_profile, job_requirements):
    """Test profile analysis handling of AI service failure."""
    profile_analyzer._claude_client.analyze_profile.side_effect = Exception("AI service error")
    
    with pytest.raises(Exception) as exc_info:
        await profile_analyzer.analyze_profile(sample_profile, job_requirements)
    assert "AI service error" in str(exc_info.value)

@pytest.mark.asyncio
async def test_analyze_profile_skill_matcher_failure(profile_analyzer, sample_profile, job_requirements):
    """Test profile analysis handling of skill matcher failure."""
    profile_analyzer._skill_matcher.calculate_skill_match.side_effect = Exception("Skill matcher error")
    
    with pytest.raises(Exception) as exc_info:
        await profile_analyzer.analyze_profile(sample_profile, job_requirements)
    assert "Skill matcher error" in str(exc_info.value)

def test_profile_analyzer_logging(profile_analyzer, sample_profile, job_requirements):
    """Test logging functionality during profile analysis."""
    with patch.object(profile_analyzer._logger, 'info') as mock_info:
        with patch.object(profile_analyzer._logger, 'error') as mock_error:
            # Trigger some logging
            profile_analyzer._calculate_experience_match(36, 36)
            
            # Verify logging calls
            assert mock_info.called
            assert not mock_error.called

@pytest.mark.asyncio
async def test_analyze_profile_performance(profile_analyzer, sample_profile, job_requirements):
    """Test profile analysis performance metrics."""
    start_time = datetime.now()
    result = await profile_analyzer.analyze_profile(sample_profile, job_requirements)
    end_time = datetime.now()
    
    # Verify processing time is reasonable (< 1 second for test)
    processing_time = (end_time - start_time).total_seconds()
    assert processing_time < 1.0
    assert 'processing_time' in result['metadata']
    assert isinstance(result['metadata']['processing_time'], float)