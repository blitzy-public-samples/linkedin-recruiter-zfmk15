"""
Schema module initialization file for the LinkedIn Profile Analysis Service.
Exports all Pydantic schemas for profile data and analysis results validation.

Version: 1.0.0
Dependencies:
- pydantic: ^2.0.0

This module provides centralized schema management and validation rules for:
1. LinkedIn profile data structure validation
2. Claude AI analysis results validation
3. Cross-component data consistency checks
"""

from .profile import (
    ProfileSchema,
    ProfileExperienceSchema, 
    ProfileEducationSchema
)

from .analysis import (
    AnalysisResultSchema,
    SkillAnalysisSchema,
    ExperienceAnalysisSchema
)

# Export all schemas for external use
__all__ = [
    # Profile schemas
    'ProfileSchema',
    'ProfileExperienceSchema',
    'ProfileEducationSchema',
    
    # Analysis schemas
    'AnalysisResultSchema', 
    'SkillAnalysisSchema',
    'ExperienceAnalysisSchema'
]

# Schema version information
SCHEMA_VERSION = '1.0.0'
PYDANTIC_VERSION = '2.0.0'

# Schema validation configuration
SCHEMA_CONFIG = {
    'arbitrary_types_allowed': False,
    'validate_assignment': True,
    'extra': 'forbid',
    'validate_all': True
}

# Default validation settings
DEFAULT_MIN_CONFIDENCE_SCORE = 0.5
DEFAULT_MIN_MATCH_SCORE = 0.0
DEFAULT_MAX_SCORE = 1.0

# Schema documentation
SCHEMA_DOCUMENTATION = {
    'ProfileSchema': 'Main schema for validating LinkedIn profile data structure',
    'ProfileExperienceSchema': 'Schema for validating work experience entries',
    'ProfileEducationSchema': 'Schema for validating education background entries',
    'AnalysisResultSchema': 'Main schema for validating Claude AI analysis results',
    'SkillAnalysisSchema': 'Schema for validating skill-level analysis data',
    'ExperienceAnalysisSchema': 'Schema for validating experience analysis data'
}

def get_schema_info() -> dict:
    """
    Get information about available schemas and their configurations.
    
    Returns:
        dict: Schema metadata including versions, configurations and documentation
    """
    return {
        'version': SCHEMA_VERSION,
        'pydantic_version': PYDANTIC_VERSION,
        'config': SCHEMA_CONFIG,
        'schemas': SCHEMA_DOCUMENTATION,
        'validation_thresholds': {
            'min_confidence': DEFAULT_MIN_CONFIDENCE_SCORE,
            'min_match_score': DEFAULT_MIN_MATCH_SCORE,
            'max_score': DEFAULT_MAX_SCORE
        }
    }