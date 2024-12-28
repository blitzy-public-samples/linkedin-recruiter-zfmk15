"""
Schema package initializer that exports all Pydantic validation schemas for the LinkedIn profile search service.
Provides comprehensive data validation, schema versioning, and documentation for profile and search operations.

Dependencies:
pydantic==2.0.0
"""

import re
from typing import Optional
from packaging import version

# Import profile-related schemas
from .profile import (
    ProfileSchema,
    ProfileExperienceSchema, 
    ProfileEducationSchema,
    ProfileSkillSchema,
    ProfileCertificationSchema
)

# Import search-related schemas
from .search import (
    SearchCriteriaSchema,
    SearchResultSchema,
    SearchResponseSchema,
    SearchFilterSchema,
    LocationFilterSchema,
    ExperienceFilterSchema,
    SkillsFilterSchema
)

# Define schema version and exports
SCHEMA_VERSION = "1.0.0"

__all__ = [
    # Profile schemas
    "ProfileSchema",
    "ProfileExperienceSchema",
    "ProfileEducationSchema",
    "ProfileSkillSchema", 
    "ProfileCertificationSchema",
    
    # Search schemas
    "SearchCriteriaSchema",
    "SearchResultSchema",
    "SearchResponseSchema",
    "SearchFilterSchema",
    "LocationFilterSchema",
    "ExperienceFilterSchema",
    "SkillsFilterSchema"
]

def validate_schema_version(client_version: str) -> bool:
    """
    Validates schema version compatibility between client and server.
    
    Args:
        client_version (str): Schema version string from client
        
    Returns:
        bool: True if versions are compatible, False otherwise
        
    Raises:
        ValueError: If client version string is invalid
    """
    if not re.match(r'^\d+\.\d+\.\d+$', client_version):
        raise ValueError("Invalid version string format. Must be X.Y.Z")
        
    server_ver = version.parse(SCHEMA_VERSION)
    client_ver = version.parse(client_version)
    
    # Major version must match for compatibility
    if server_ver.major != client_ver.major:
        return False
        
    # Client minor version must be less than or equal to server
    if client_ver.minor > server_ver.minor:
        return False
        
    return True

# Schema documentation
SCHEMA_DOCS = {
    # Profile schemas
    "ProfileSchema": "Main schema for validating LinkedIn profile data with comprehensive validation rules",
    "ProfileExperienceSchema": "Schema for validating work experience entries with enhanced validation",
    "ProfileEducationSchema": "Schema for validating education entries with enhanced validation",
    "ProfileSkillSchema": "Schema for validating professional skills with taxonomy validation",
    "ProfileCertificationSchema": "Schema for validating professional certifications",
    
    # Search schemas  
    "SearchCriteriaSchema": "Schema for validating search criteria with comprehensive validation rules",
    "SearchResultSchema": "Schema for validating individual search results with relevance scoring",
    "SearchResponseSchema": "Schema for validating search responses with pagination support",
    "SearchFilterSchema": "Base schema for search filter validation",
    "LocationFilterSchema": "Schema for validating location filter criteria",
    "ExperienceFilterSchema": "Schema for validating experience filter criteria",
    "SkillsFilterSchema": "Schema for validating skills filter criteria"
}

# Schema validation configuration
VALIDATION_CONFIG = {
    "arbitrary_types_allowed": True,
    "validate_assignment": True,
    "validate_all": True,
    "extra": "forbid"
}

# Apply validation config to all schemas
for schema in __all__:
    if hasattr(globals()[schema], "Config"):
        for key, value in VALIDATION_CONFIG.items():
            setattr(globals()[schema].Config, key, value)