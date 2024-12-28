"""Core data models package for the LinkedIn Profile Analysis Service.
Provides models for profile data representation and AI-powered analysis results.

This package exports the core data models used throughout the analysis service
for representing LinkedIn profiles and their AI-powered analysis results.

Version: 1.0.0
Requires Python 3.11+
"""

# Import core profile models
from .profile import (  # pydantic v2.0.0+
    Profile,
    ProfileExperience,
    ProfileEducation
)

# Import analysis result models
from .analysis_result import (  # pydantic v2.0.0+
    AnalysisResult,
    SkillAnalysis,
    ExperienceAnalysis
)

# Define package exports
__all__ = [
    # Profile models
    'Profile',
    'ProfileExperience', 
    'ProfileEducation',
    
    # Analysis models
    'AnalysisResult',
    'SkillAnalysis',
    'ExperienceAnalysis'
]

# Package metadata
__version__ = '1.0.0'
__author__ = 'LinkedIn Profile Analysis Service Team'
__description__ = 'Core data models for LinkedIn profile analysis and AI-powered evaluation'

# Model version compatibility
PROFILE_MODEL_VERSION = '1.0.0'
ANALYSIS_MODEL_VERSION = '1.0.0'

def get_model_versions() -> dict:
    """Return the current versions of all data models.
    
    Returns:
        dict: Version information for each model type
    """
    return {
        'profile': PROFILE_MODEL_VERSION,
        'analysis': ANALYSIS_MODEL_VERSION
    }