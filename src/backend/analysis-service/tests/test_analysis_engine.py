"""
Comprehensive test suite for the AnalysisEngine class that validates profile analysis workflow,
AI evaluation accuracy, concurrent processing capabilities, and error handling mechanisms.

Version: 1.0.0
"""

import pytest
import pytest_asyncio  # version: 0.21.0
from unittest.mock import MagicMock, patch
import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from ...src.core.analysis_engine import (
    AnalysisEngine,
    MIN_CONFIDENCE_SCORE,
    ANALYSIS_BATCH_SIZE
)
from ...src.models.profile import Profile, ProfileExperience, ProfileEducation

# Test constants
MOCK_AI_ANALYSIS_RESULT = {
    'match_score': 0.85,
    'confidence_score': 0.9,
    'analysis': {
        'strengths': ['Strong technical background', 'Leadership experience'],
        'gaps': ['Missing cloud certification']
    },
    'timestamp': datetime.now(timezone.utc).isoformat(),
    'model': 'claude-2',
    'processing_time': 1.5
}

MOCK_SKILL_MATCH_RESULT = {
    'overall_match_score': 0.8,
    'match_details': {
        'matched_required_skills': ['python', 'java'],
        'matched_preferred_skills': ['kubernetes'],
        'missing_critical_skills': ['aws'],
        'skill_improvement_recommendations': ['Consider AWS certification']
    },
    'confidence_score': 0.85
}

@pytest.fixture
def sample_profile():
    """Create a test profile with comprehensive data."""
    return Profile(
        id=uuid4(),
        linkedin_url='https://linkedin.com/in/test-user',
        full_name='Test User',
        headline='Senior Software Engineer',
        summary='Experienced developer with 10 years in tech',
        location='San Francisco, CA',
        experience=[
            ProfileExperience(
                company_name='Tech Corp',
                title='Senior Developer',
                description='Led development team',
                start_date=datetime(2020, 1, 1),
                end_date=None,
                skills=['python', 'java']
            )
        ],
        education=[
            ProfileEducation(
                institution='University of Tech',
                degree='BS Computer Science',
                start_date=datetime(2015, 1, 1),
                end_date=datetime(2019, 1, 1)
            )
        ],
        skills=['python', 'java', 'kubernetes'],
        certifications=['AWS Developer']
    )

@pytest.fixture
def sample_job_requirements():
    """Create test job requirements."""
    return {
        'required_skills': ['python', 'java', 'aws'],
        'preferred_skills': ['kubernetes', 'docker'],
        'min_experience': 5,
        'max_experience': 10,
        'role_type': 'senior_developer'
    }

@pytest_asyncio.fixture
async def analysis_engine(mock_claude_client, mock_profile_analyzer, mock_skill_matcher):
    """Create configured AnalysisEngine instance with mocks."""
    engine = AnalysisEngine(
        claude_client=mock_claude_client,
        profile_analyzer=mock_profile_analyzer,
        skill_matcher=mock_skill_matcher
    )
    yield engine

@pytest.mark.asyncio
async def test_analysis_engine_initialization(
    mock_claude_client,
    mock_profile_analyzer,
    mock_skill_matcher
):
    """Test proper initialization of AnalysisEngine with dependencies."""
    engine = AnalysisEngine(
        claude_client=mock_claude_client,
        profile_analyzer=mock_profile_analyzer,
        skill_matcher=mock_skill_matcher
    )

    assert engine._claude_client == mock_claude_client
    assert engine._profile_analyzer == mock_profile_analyzer
    assert engine._skill_matcher == mock_skill_matcher
    assert isinstance(engine._concurrency_limiter, asyncio.Semaphore)
    assert engine._analysis_cache is not None
    assert engine._logger is not None

@pytest.mark.asyncio
async def test_analyze_single_profile(
    analysis_engine,
    sample_profile,
    sample_job_requirements,
    mock_claude_client,
    mock_skill_matcher
):
    """Test comprehensive analysis of a single profile."""
    # Configure mocks
    mock_claude_client.analyze_profile.return_value = MOCK_AI_ANALYSIS_RESULT
    mock_skill_matcher.calculate_skill_match.return_value = MOCK_SKILL_MATCH_RESULT
    mock_skill_matcher.analyze_skill_gaps.return_value = {
        'missing_critical': ['aws'],
        'recommendations': ['AWS certification recommended'],
        'coverage_percentage': 80
    }

    # Execute analysis
    result = await analysis_engine.analyze_single_profile(
        sample_profile,
        sample_job_requirements
    )

    # Verify analysis execution
    mock_claude_client.analyze_profile.assert_called_once_with(
        sample_profile.to_dict(),
        sample_job_requirements,
        str(sample_profile.id)
    )

    mock_skill_matcher.calculate_skill_match.assert_called_once()
    mock_skill_matcher.analyze_skill_gaps.assert_called_once()

    # Validate result structure
    assert isinstance(result, dict)
    assert 'overall_match_score' in result
    assert 'confidence_score' in result
    assert 'ai_analysis' in result
    assert 'skill_analysis' in result
    assert 'gap_analysis' in result
    assert 'metadata' in result

    # Verify score calculations
    assert 0 <= result['overall_match_score'] <= 100
    assert 0 <= result['confidence_score'] <= 100
    assert result['confidence_score'] >= MIN_CONFIDENCE_SCORE * 100

    # Verify caching
    cache_key = f"{sample_profile.id}:{hash(frozenset(sample_job_requirements.items()))}"
    assert analysis_engine._analysis_cache[cache_key] == result

@pytest.mark.asyncio
async def test_analyze_profiles_batch(
    analysis_engine,
    sample_profile,
    sample_job_requirements
):
    """Test concurrent analysis of multiple profiles."""
    # Create batch of test profiles
    profiles = [sample_profile for _ in range(ANALYSIS_BATCH_SIZE + 5)]

    # Configure mocks for batch processing
    analysis_engine._claude_client.analyze_profile.return_value = MOCK_AI_ANALYSIS_RESULT
    analysis_engine._skill_matcher.calculate_skill_match.return_value = MOCK_SKILL_MATCH_RESULT
    analysis_engine._skill_matcher.analyze_skill_gaps.return_value = {
        'missing_critical': ['aws'],
        'recommendations': ['AWS certification recommended'],
        'coverage_percentage': 80
    }

    # Execute batch analysis
    results = await analysis_engine.analyze_profiles(profiles, sample_job_requirements)

    # Verify batch processing
    assert len(results) == len(profiles)
    assert all(isinstance(result, dict) for result in results)
    assert all('overall_match_score' in result for result in results)
    assert all('confidence_score' in result for result in results)

    # Verify concurrency control
    assert analysis_engine._claude_client.analyze_profile.call_count == len(profiles)
    assert analysis_engine._skill_matcher.calculate_skill_match.call_count == len(profiles)

@pytest.mark.asyncio
async def test_error_handling(analysis_engine, sample_profile, sample_job_requirements):
    """Test comprehensive error handling scenarios."""
    # Test invalid profile data
    with pytest.raises(ValueError):
        await analysis_engine.analyze_single_profile(None, sample_job_requirements)

    # Test missing job requirements
    with pytest.raises(ValueError):
        await analysis_engine.analyze_single_profile(sample_profile, {})

    # Test AI service failure
    analysis_engine._claude_client.analyze_profile.side_effect = RuntimeError("API Error")
    with pytest.raises(RuntimeError):
        await analysis_engine.analyze_single_profile(
            sample_profile,
            sample_job_requirements
        )

    # Test batch processing with mixed failures
    profiles = [sample_profile for _ in range(3)]
    analysis_engine._claude_client.analyze_profile.side_effect = [
        MOCK_AI_ANALYSIS_RESULT,
        RuntimeError("API Error"),
        MOCK_AI_ANALYSIS_RESULT
    ]

    results = await analysis_engine.analyze_profiles(profiles, sample_job_requirements)
    assert len(results) == 2  # Should have 2 successful results

@pytest.mark.asyncio
async def test_analysis_result_validation(
    analysis_engine,
    sample_profile,
    sample_job_requirements
):
    """Test validation of analysis results and confidence thresholds."""
    # Configure mock with low confidence score
    low_confidence_result = MOCK_AI_ANALYSIS_RESULT.copy()
    low_confidence_result['confidence_score'] = 0.6

    analysis_engine._claude_client.analyze_profile.return_value = low_confidence_result
    analysis_engine._skill_matcher.calculate_skill_match.return_value = MOCK_SKILL_MATCH_RESULT

    # Execute analysis
    result = await analysis_engine.analyze_single_profile(
        sample_profile,
        sample_job_requirements
    )

    # Verify confidence warning
    assert result['confidence_score'] < MIN_CONFIDENCE_SCORE * 100
    # Verify result still contains all required components
    assert all(key in result for key in [
        'overall_match_score',
        'confidence_score',
        'ai_analysis',
        'skill_analysis',
        'gap_analysis',
        'metadata'
    ])

@pytest.mark.asyncio
async def test_cache_behavior(
    analysis_engine,
    sample_profile,
    sample_job_requirements
):
    """Test caching mechanism and cache hit scenarios."""
    # First analysis - should hit API
    result1 = await analysis_engine.analyze_single_profile(
        sample_profile,
        sample_job_requirements
    )

    initial_api_calls = analysis_engine._claude_client.analyze_profile.call_count

    # Second analysis with same inputs - should use cache
    result2 = await analysis_engine.analyze_single_profile(
        sample_profile,
        sample_job_requirements
    )

    assert analysis_engine._claude_client.analyze_profile.call_count == initial_api_calls
    assert result1 == result2

    # Modify requirements and verify cache miss
    modified_requirements = sample_job_requirements.copy()
    modified_requirements['required_skills'].append('nodejs')

    result3 = await analysis_engine.analyze_single_profile(
        sample_profile,
        modified_requirements
    )

    assert analysis_engine._claude_client.analyze_profile.call_count > initial_api_calls
    assert result3 != result1