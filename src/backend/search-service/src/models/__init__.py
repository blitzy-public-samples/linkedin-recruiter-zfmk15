"""
Models package initialization for LinkedIn Profile Search Service.
Provides type-safe access to Profile and SearchCriteria models with comprehensive validation.

Version: 1.0.0
Requires Python: >=3.11
Type Support: Enabled (py.typed)

Dependencies:
pydantic==2.0.0 # For Profile models
dataclasses # Built-in Python 3.7+ for SearchCriteria models
"""

from typing import TYPE_CHECKING

# Profile model imports with full type support
from .profile import (
    Profile,
    ProfileExperience,
    ProfileEducation,
    ProfileSkill
)

# SearchCriteria model imports with validation support
from .search_criteria import (
    SearchCriteria,
    LocationCriteria,
    ExperienceCriteria
)

# Package metadata
__version__ = "1.0.0"

# Public API exports - these are the models that should be imported by other modules
__all__ = [
    # Profile models
    "Profile",
    "ProfileExperience", 
    "ProfileEducation",
    "ProfileSkill",
    
    # Search criteria models
    "SearchCriteria",
    "LocationCriteria",
    "ExperienceCriteria"
]

# Type checking block for runtime optimization
if TYPE_CHECKING:
    from .profile import (
        Profile as ProfileType,
        ProfileExperience as ProfileExperienceType,
        ProfileEducation as ProfileEducationType,
        ProfileSkill as ProfileSkillType
    )
    from .search_criteria import (
        SearchCriteria as SearchCriteriaType,
        LocationCriteria as LocationCriteriaType,
        ExperienceCriteria as ExperienceCriteriaType
    )