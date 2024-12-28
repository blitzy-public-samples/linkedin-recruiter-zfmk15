"""
Pydantic schema definitions for LinkedIn profile search criteria validation and serialization.
Provides comprehensive schema validation with enhanced security and performance features.

Dependencies:
pydantic==2.0.0
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, UUID
from pydantic import BaseModel, Field, validator
from pydantic.validators import *

from ..models.search_criteria import LocationCriteria, ExperienceCriteria
from .profile import ProfileSchema

class LocationFilterSchema(BaseModel):
    """Pydantic schema for validating location filter criteria with enhanced validation."""
    
    countries: Optional[List[str]] = Field(
        None,
        description="List of ISO 3166-1 alpha-2 country codes",
        max_items=50
    )
    cities: Optional[List[str]] = Field(
        None,
        description="List of city names",
        max_items=100
    )
    remote_only: Optional[bool] = Field(
        None,
        description="Flag for remote work requirement"
    )
    region: Optional[str] = Field(
        None,
        description="Geographic region code",
        max_length=50
    )
    geo_bounds: Optional[Dict[str, float]] = Field(
        None,
        description="Geographic boundary coordinates"
    )

    @validator('countries')
    def validate_countries(cls, v):
        if v:
            country_pattern = r'^[A-Z]{2}$'
            for country in v:
                if not re.match(country_pattern, country):
                    raise ValueError(f"Invalid country code format: {country}")
        return v

    @validator('cities')
    def validate_cities(cls, v):
        if v:
            city_pattern = r'^[A-Za-z\s-]{2,50}$'
            for city in v:
                if not re.match(city_pattern, city):
                    raise ValueError(f"Invalid city name format: {city}")
        return v

    @validator('geo_bounds')
    def validate_geo_bounds(cls, v):
        if v:
            required_keys = {'lat_min', 'lat_max', 'lon_min', 'lon_max'}
            if not all(key in v for key in required_keys):
                raise ValueError("Missing required geo_bounds coordinates")
            
            # Validate coordinate ranges
            if not (-90 <= v['lat_min'] <= 90 and -90 <= v['lat_max'] <= 90):
                raise ValueError("Latitude must be between -90 and 90")
            if not (-180 <= v['lon_min'] <= 180 and -180 <= v['lon_max'] <= 180):
                raise ValueError("Longitude must be between -180 and 180")
            if v['lat_min'] > v['lat_max'] or v['lon_min'] > v['lon_max']:
                raise ValueError("Invalid coordinate ranges")
        return v

class ExperienceFilterSchema(BaseModel):
    """Pydantic schema for validating experience filter criteria with industry validation."""
    
    min_years: Optional[int] = Field(
        None,
        description="Minimum years of experience",
        ge=0,
        le=50
    )
    max_years: Optional[int] = Field(
        None,
        description="Maximum years of experience",
        ge=0,
        le=50
    )
    industries: Optional[List[str]] = Field(
        None,
        description="List of industry codes",
        max_items=30
    )
    roles: Optional[List[str]] = Field(
        None,
        description="List of job roles",
        max_items=50
    )
    role_durations: Optional[Dict[str, int]] = Field(
        None,
        description="Required duration for specific roles"
    )

    @validator('max_years')
    def validate_years_range(cls, v, values):
        if v is not None and 'min_years' in values and values['min_years'] is not None:
            if v < values['min_years']:
                raise ValueError("max_years must be greater than min_years")
        return v

    @validator('industries')
    def validate_industries(cls, v):
        if v:
            # Validate against LinkedIn standard industry codes
            valid_industries = {'technology', 'finance', 'healthcare'}  # Example set
            invalid_industries = set(v) - valid_industries
            if invalid_industries:
                raise ValueError(f"Invalid industry codes: {invalid_industries}")
        return v

class SkillsFilterSchema(BaseModel):
    """Pydantic schema for validating skills filter criteria with taxonomy validation."""
    
    required: List[str] = Field(
        ...,
        description="Required skills",
        min_items=1,
        max_items=50
    )
    preferred: Optional[List[str]] = Field(
        None,
        description="Preferred skills",
        max_items=100
    )
    skill_levels: Optional[Dict[str, int]] = Field(
        None,
        description="Required proficiency levels (1-5)"
    )
    skill_alternatives: Optional[Dict[str, List[str]]] = Field(
        None,
        description="Alternative skills mapping"
    )

    @validator('required', 'preferred')
    def validate_skill_names(cls, v):
        if v:
            skill_pattern = r'^[a-zA-Z0-9\s\-\+\#\.\,\/\(\)]{1,100}$'
            for skill in v:
                if not re.match(skill_pattern, skill):
                    raise ValueError(f"Invalid skill format: {skill}")
        return v

    @validator('skill_levels')
    def validate_skill_levels(cls, v):
        if v:
            for skill, level in v.items():
                if not 1 <= level <= 5:
                    raise ValueError(f"Invalid skill level for {skill}: must be 1-5")
        return v

class SearchCriteriaSchema(BaseModel):
    """Main schema for validating search criteria with comprehensive validation rules."""
    
    search_id: UUID = Field(..., description="Unique search identifier")
    template_name: str = Field(
        ...,
        description="Search template name",
        min_length=1,
        max_length=100
    )
    keywords: str = Field(
        ...,
        description="Boolean search keywords",
        min_length=1,
        max_length=1000
    )
    location: LocationFilterSchema
    experience: ExperienceFilterSchema
    skills: SkillsFilterSchema
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    is_active: bool = Field(default=True)
    custom_filters: Optional[Dict[str, Any]] = None

    @validator('keywords')
    def validate_boolean_query(cls, v):
        """Validate boolean search query syntax."""
        operators = {'AND', 'OR', 'NOT'}
        tokens = v.split()
        
        # Basic syntax validation
        parentheses_count = 0
        for token in tokens:
            if token == '(':
                parentheses_count += 1
            elif token == ')':
                parentheses_count -= 1
            if parentheses_count < 0:
                raise ValueError("Invalid parentheses in boolean query")
                
        if parentheses_count != 0:
            raise ValueError("Unmatched parentheses in boolean query")
            
        return v

    @validator('updated_at')
    def validate_timestamps(cls, v, values):
        if v and 'created_at' in values and v < values['created_at']:
            raise ValueError("updated_at cannot be before created_at")
        return v

class SearchResultSchema(BaseModel):
    """Schema for validating individual search results."""
    
    profile_id: UUID
    match_score: float = Field(..., ge=0.0, le=1.0)
    relevance_factors: Dict[str, float]
    profile: ProfileSchema
    matched_at: datetime = Field(default_factory=datetime.now)

    @validator('relevance_factors')
    def validate_relevance_factors(cls, v):
        required_factors = {'skill_match', 'experience_match', 'location_match'}
        if not all(factor in v for factor in required_factors):
            raise ValueError(f"Missing required relevance factors: {required_factors}")
        return v

class SearchResponseSchema(BaseModel):
    """Schema for validating complete search response with pagination."""
    
    search_id: UUID
    results: List[SearchResultSchema]
    total_results: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
    execution_time: float
    filters_applied: Dict[str, Any]

    @validator('results')
    def validate_results_count(cls, v, values):
        if 'page_size' in values and len(v) > values['page_size']:
            raise ValueError("Results exceed page_size limit")
        return v

    class Config:
        validate_assignment = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }