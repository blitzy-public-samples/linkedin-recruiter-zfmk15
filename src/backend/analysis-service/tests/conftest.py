"""
Pytest configuration and fixtures for the analysis service tests.
Provides comprehensive mock objects, test data, and async test support for unit and integration testing.

Version: 1.0.0
"""

import pytest
import pytest_asyncio  # version: 0.21.0
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
import uuid
from typing import Dict, Any

from ..src.core.claude_client import ClaudeClient
from ..src.core.profile_analyzer import ProfileAnalyzer
from ..src.core.skill_matcher import SkillMatcher

# Sample test data constants
SAMPLE_ANALYSIS_RESULT = {
    'match_score': 0.85,
    'skill_match': 0.9,
    'experience_match': 0.8,
    'education_match': 0.95,
    'industry_match': 0.85,
    'insights': ['Sample insight 1', 'Sample insight 2'],
    'confidence_score': 0.92,
    'analysis_timestamp': '2023-08-01T12:00:00Z'
}

SAMPLE_SKILL_MATCH_RESULT = {
    'overall_score': 0.9,
    'required_skills_match': 0.95,
    'preferred_skills_match': 0.85,
    'missing_skills': ['skill1', 'skill2'],
    'skill_levels': {'skill1': 0.8, 'skill2': 0.9},
    'gap_analysis': ['gap1', 'gap2'],
    'recommendations': ['rec1', 'rec2']
}

@pytest.fixture
@pytest_asyncio.fixture
async def mock_claude_client() -> AsyncMock:
    """
    Fixture providing a mocked Claude AI client with async support and response validation.
    
    Returns:
        AsyncMock: Mocked ClaudeClient instance with async capabilities
    """
    mock_client = AsyncMock(spec=ClaudeClient)
    
    # Configure analyze_profile mock
    async def mock_analyze_profile(profile_data: Dict[str, Any], 
                                 job_requirements: Dict[str, Any],
                                 correlation_id: str) -> Dict[str, Any]:
        return {
            'match_score': 0.85,
            'analysis': {
                'experience_relevance': 'High',
                'skill_alignment': 'Strong',
                'cultural_fit': 'Good'
            },
            'strengths': ['Technical expertise', 'Leadership skills'],
            'gaps': ['Cloud certification'],
            'confidence_score': 0.92,
            'model': 'claude-2',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'processing_time': 0.5
        }
    
    mock_client.analyze_profile.side_effect = mock_analyze_profile
    
    # Configure validation method
    mock_client.validate_response.return_value = True
    
    return mock_client

@pytest.fixture
def mock_skill_matcher() -> MagicMock:
    """
    Fixture providing a mocked skill matcher with comprehensive skill analysis capabilities.
    
    Returns:
        MagicMock: Mocked SkillMatcher instance
    """
    mock_matcher = MagicMock(spec=SkillMatcher)
    
    # Configure calculate_skill_match
    mock_matcher.calculate_skill_match.return_value = {
        'overall_match_score': 0.88,
        'required_skills_score': 0.92,
        'preferred_skills_score': 0.85,
        'confidence_score': 0.90,
        'gap_analysis': {
            'matched_required': ['python', 'java'],
            'matched_preferred': ['kubernetes'],
            'missing_critical': ['aws'],
            'missing_preferred': ['terraform'],
            'coverage_percentage': {
                'required': 85.0,
                'preferred': 75.0
            },
            'recommendations': [
                {
                    'skill': 'aws',
                    'priority': 'High',
                    'rationale': 'Critical required skill'
                }
            ]
        },
        'match_details': {
            'matched_required_skills': ['python', 'java'],
            'matched_preferred_skills': ['kubernetes'],
            'missing_critical_skills': ['aws'],
            'skill_improvement_recommendations': [
                'Obtain AWS certification',
                'Complete cloud projects'
            ]
        }
    }
    
    # Configure analyze_skill_gaps
    mock_matcher.analyze_skill_gaps.return_value = {
        'matched_required': ['python', 'java'],
        'matched_preferred': ['kubernetes'],
        'missing_critical': ['aws'],
        'missing_preferred': ['terraform'],
        'coverage_percentage': {
            'required': 85.0,
            'preferred': 75.0
        },
        'recommendations': [
            {
                'skill': 'aws',
                'priority': 'High',
                'rationale': 'Critical required skill'
            }
        ]
    }
    
    return mock_matcher

@pytest.fixture
@pytest_asyncio.fixture
async def mock_profile_analyzer(mock_claude_client: AsyncMock, 
                              mock_skill_matcher: MagicMock) -> AsyncMock:
    """
    Fixture providing a mocked profile analyzer with injected dependencies.
    
    Args:
        mock_claude_client: Mocked Claude client
        mock_skill_matcher: Mocked skill matcher
        
    Returns:
        AsyncMock: Mocked ProfileAnalyzer instance
    """
    mock_analyzer = AsyncMock(spec=ProfileAnalyzer)
    
    # Configure analyze_profile behavior
    async def mock_analyze_profile(profile: Dict[str, Any],
                                 job_requirements: Dict[str, Any],
                                 use_cache: bool = True) -> Dict[str, Any]:
        return {
            'profile_id': str(uuid.uuid4()),
            'overall_match_score': 87.5,
            'confidence_score': 91.0,
            'experience_analysis': {
                'score': 85.0,
                'total_months': 60,
                'meets_requirements': True
            },
            'skill_analysis': {
                'score': 88.0,
                'matched_required': ['python', 'java'],
                'matched_preferred': ['kubernetes'],
                'missing_critical': ['aws'],
                'recommendations': ['Obtain AWS certification']
            },
            'ai_insights': {
                'score': 89.0,
                'analysis': {
                    'experience_relevance': 'High',
                    'skill_alignment': 'Strong'
                },
                'key_strengths': ['Technical expertise'],
                'improvement_areas': ['Cloud skills']
            },
            'metadata': {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'model_version': 'claude-2',
                'processing_time': 0.5
            }
        }
    
    mock_analyzer.analyze_profile.side_effect = mock_analyze_profile
    
    # Configure validation method
    mock_analyzer.validate_profile.return_value = True
    
    return mock_analyzer

@pytest.fixture
def sample_profile_data() -> Dict[str, Any]:
    """
    Fixture providing comprehensive sample LinkedIn profile data for testing.
    
    Returns:
        Dict[str, Any]: Sample profile data dictionary
    """
    return {
        'id': str(uuid.uuid4()),
        'linkedin_url': 'https://www.linkedin.com/in/johndoe',
        'full_name': 'John Doe',
        'headline': 'Senior Software Engineer',
        'summary': 'Experienced software engineer with focus on cloud technologies',
        'location': 'San Francisco, CA',
        'experience': [
            {
                'company_name': 'Tech Corp',
                'title': 'Senior Software Engineer',
                'description': 'Led backend development team',
                'start_date': '2020-01-01T00:00:00Z',
                'end_date': None,
                'location': 'San Francisco, CA',
                'skills': ['python', 'java', 'kubernetes']
            }
        ],
        'education': [
            {
                'institution': 'University of Technology',
                'degree': 'Bachelor of Science',
                'field_of_study': 'Computer Science',
                'start_date': '2012-09-01T00:00:00Z',
                'end_date': '2016-06-01T00:00:00Z'
            }
        ],
        'skills': ['python', 'java', 'kubernetes', 'docker'],
        'certifications': ['AWS Developer Associate'],
        'languages': ['English', 'Spanish']
    }

@pytest.fixture
def sample_job_requirements() -> Dict[str, Any]:
    """
    Fixture providing detailed job requirements for testing.
    
    Returns:
        Dict[str, Any]: Sample job requirements dictionary
    """
    return {
        'required_skills': [
            'python',
            'java',
            'aws',
            'kubernetes'
        ],
        'preferred_skills': [
            'terraform',
            'docker',
            'ci/cd'
        ],
        'min_experience': 48,  # months
        'max_experience': 120,  # months
        'education_level': "Bachelor's Degree",
        'role_type': 'Senior Software Engineer',
        'industry': 'Technology',
        'required_certifications': ['AWS Certification']
    }