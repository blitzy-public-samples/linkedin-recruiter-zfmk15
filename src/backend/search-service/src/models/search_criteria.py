# Version information for external dependencies:
# dataclasses: built-in Python 3.7+
# typing: built-in Python 3.5+
# datetime: built-in

from dataclasses import dataclass
from typing import UUID, List, Optional, Dict, Any
from datetime import datetime

@dataclass
class LocationCriteria:
    """
    Model representing location search criteria with validation for geographic hierarchies 
    and remote work preferences.
    
    Attributes:
        location (str): Primary location search string
        country (Optional[str]): ISO 3166-1 alpha-2 country code
        region (Optional[str]): Region/state code within country
        city (Optional[str]): City name within region
        remote_only (Optional[bool]): Flag indicating remote work requirement
        preferred_locations (Optional[List[str]]): List of additional acceptable locations
    """
    location: str
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    remote_only: Optional[bool] = None
    preferred_locations: Optional[List[str]] = None

    def is_valid(self) -> bool:
        """
        Validates location criteria fields against geographic standards and business rules.
        
        Returns:
            bool: True if all location criteria are valid, False otherwise
        """
        # Must have at least a primary location or remote_only flag
        if not self.location and not self.remote_only:
            return False

        # Validate country code if provided
        if self.country and (
            not isinstance(self.country, str) or 
            len(self.country) != 2 or 
            not self.country.isalpha()
        ):
            return False

        # Validate region code format if provided
        if self.region and (
            not isinstance(self.region, str) or
            len(self.region) > 3 or
            not self.region.isalnum()
        ):
            return False

        # Validate city name format if provided
        if self.city and (
            not isinstance(self.city, str) or
            len(self.city) > 100
        ):
            return False

        # Validate preferred locations list
        if self.preferred_locations:
            if not isinstance(self.preferred_locations, list):
                return False
            if len(self.preferred_locations) > 10:  # Maximum allowed locations
                return False
            if not all(isinstance(loc, str) and len(loc) <= 100 for loc in self.preferred_locations):
                return False

        return True

@dataclass
class ExperienceCriteria:
    """
    Model representing experience level criteria with validation for years, titles,
    and industry requirements.
    
    Attributes:
        min_years (Optional[int]): Minimum years of experience required
        max_years (Optional[int]): Maximum years of experience considered
        required_titles (Optional[List[str]]): List of required job titles
        preferred_titles (Optional[List[str]]): List of preferred job titles
        industries (Optional[List[str]]): List of relevant industry codes
    """
    min_years: Optional[int] = None
    max_years: Optional[int] = None
    required_titles: Optional[List[str]] = None
    preferred_titles: Optional[List[str]] = None
    industries: Optional[List[str]] = None

    def is_valid(self) -> bool:
        """
        Validates experience criteria against business rules and standard classifications.
        
        Returns:
            bool: True if all experience criteria are valid, False otherwise
        """
        # Validate years range
        if self.min_years is not None:
            if not isinstance(self.min_years, int) or self.min_years < 0:
                return False
            
        if self.max_years is not None:
            if not isinstance(self.max_years, int) or self.max_years < 0:
                return False
            
        if self.min_years and self.max_years and self.min_years > self.max_years:
            return False

        # Validate title lists
        if self.required_titles:
            if not isinstance(self.required_titles, list):
                return False
            if len(self.required_titles) > 20:  # Maximum allowed titles
                return False
            if not all(isinstance(title, str) and len(title) <= 200 for title in self.required_titles):
                return False

        if self.preferred_titles:
            if not isinstance(self.preferred_titles, list):
                return False
            if len(self.preferred_titles) > 50:  # Maximum allowed preferred titles
                return False
            if not all(isinstance(title, str) and len(title) <= 200 for title in self.preferred_titles):
                return False

        # Validate industries list
        if self.industries:
            if not isinstance(self.industries, list):
                return False
            if len(self.industries) > 30:  # Maximum allowed industries
                return False
            if not all(isinstance(ind, str) and len(ind) <= 50 for ind in self.industries):
                return False

        return True

@dataclass
class SearchCriteria:
    """
    Main model class for LinkedIn profile search criteria with comprehensive validation
    and serialization.
    
    Attributes:
        search_id (UUID): Unique identifier for the search
        template_name (str): Name of the search template
        keywords (str): Boolean search keywords
        location (LocationCriteria): Location search criteria
        experience (ExperienceCriteria): Experience search criteria
        required_skills (List[str]): List of required skills
        preferred_skills (Optional[List[str]]): List of preferred skills
        certifications (Optional[List[str]]): List of required certifications
        custom_filters (Optional[Dict[str, Any]]): Additional custom search filters
        created_at (datetime): Timestamp of criteria creation
        updated_at (Optional[datetime]): Timestamp of last update
        is_active (bool): Flag indicating if criteria is active
    """
    search_id: UUID
    template_name: str
    keywords: str
    location: LocationCriteria
    experience: ExperienceCriteria
    required_skills: List[str]
    preferred_skills: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    custom_filters: Optional[Dict[str, Any]] = None
    created_at: datetime = datetime.now()
    updated_at: Optional[datetime] = None
    is_active: bool = True

    def validate(self) -> bool:
        """
        Performs comprehensive validation of all search criteria components.
        
        Returns:
            bool: True if all criteria are valid, False otherwise
        """
        # Validate basic fields
        if not isinstance(self.search_id, UUID):
            return False
            
        if not isinstance(self.template_name, str) or not 1 <= len(self.template_name) <= 100:
            return False
            
        if not isinstance(self.keywords, str) or not 1 <= len(self.keywords) <= 1000:
            return False

        # Validate nested criteria
        if not isinstance(self.location, LocationCriteria) or not self.location.is_valid():
            return False
            
        if not isinstance(self.experience, ExperienceCriteria) or not self.experience.is_valid():
            return False

        # Validate skills lists
        if not isinstance(self.required_skills, list) or len(self.required_skills) > 50:
            return False
            
        if not all(isinstance(skill, str) and len(skill) <= 100 for skill in self.required_skills):
            return False

        if self.preferred_skills:
            if not isinstance(self.preferred_skills, list) or len(self.preferred_skills) > 100:
                return False
            if not all(isinstance(skill, str) and len(skill) <= 100 for skill in self.preferred_skills):
                return False

        # Validate certifications
        if self.certifications:
            if not isinstance(self.certifications, list) or len(self.certifications) > 30:
                return False
            if not all(isinstance(cert, str) and len(cert) <= 200 for cert in self.certifications):
                return False

        # Validate custom filters
        if self.custom_filters and not isinstance(self.custom_filters, dict):
            return False

        # Validate timestamps
        if not isinstance(self.created_at, datetime):
            return False
            
        if self.updated_at and not isinstance(self.updated_at, datetime):
            return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts search criteria to dictionary format for API responses.
        
        Returns:
            Dict[str, Any]: Dictionary representation of search criteria
        """
        result = {
            'search_id': str(self.search_id),
            'template_name': self.template_name,
            'keywords': self.keywords,
            'location': {
                'location': self.location.location,
                'country': self.location.country,
                'region': self.location.region,
                'city': self.location.city,
                'remote_only': self.location.remote_only,
                'preferred_locations': self.location.preferred_locations
            },
            'experience': {
                'min_years': self.experience.min_years,
                'max_years': self.experience.max_years,
                'required_titles': self.experience.required_titles,
                'preferred_titles': self.experience.preferred_titles,
                'industries': self.experience.industries
            },
            'required_skills': self.required_skills,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active
        }

        # Add optional fields if present
        if self.preferred_skills:
            result['preferred_skills'] = self.preferred_skills
        if self.certifications:
            result['certifications'] = self.certifications
        if self.custom_filters:
            result['custom_filters'] = self.custom_filters
        if self.updated_at:
            result['updated_at'] = self.updated_at.isoformat()

        return result