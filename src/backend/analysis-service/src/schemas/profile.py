"""
Pydantic schema definitions for LinkedIn profile data validation and serialization.
Provides schema validation for profile data processing in the analysis service.

Version: 2.0.0
Dependencies:
- pydantic: ^2.0.0
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, validator

from ..models.profile import Profile, ProfileExperience, ProfileEducation

class ProfileExperienceSchema(BaseModel):
    """
    Pydantic schema for validating work experience entries in a LinkedIn profile.
    Ensures data consistency and proper formatting of experience records.
    """
    company_name: str = Field(
        ..., 
        min_length=1,
        description="Name of the employer company"
    )
    title: str = Field(
        ..., 
        min_length=1,
        description="Job title or role"
    )
    description: str = Field(
        ...,
        description="Detailed description of responsibilities and achievements"
    )
    start_date: datetime = Field(
        ...,
        description="Start date of employment"
    )
    end_date: Optional[datetime] = Field(
        None,
        description="End date of employment, None if current position"
    )
    location: Optional[str] = Field(
        None,
        description="Geographic location of the role"
    )
    skills: List[str] = Field(
        default_factory=list,
        description="Skills utilized in this role"
    )

    @validator('start_date', 'end_date')
    def validate_dates(cls, value, values):
        """
        Validate experience date ranges to ensure logical consistency.
        
        Args:
            value: Date value to validate
            values: Dict of previously validated values
            
        Returns:
            datetime: Validated date value
            
        Raises:
            ValueError: If dates are invalid or illogical
        """
        if not value:
            return value

        # Check if date is not in future
        if value > datetime.now():
            raise ValueError("Date cannot be in the future")

        # Check start_date and end_date relationship
        if 'start_date' in values and value and values['start_date']:
            if value < values['start_date']:
                raise ValueError("End date must be after start date")

        return value

class ProfileEducationSchema(BaseModel):
    """
    Pydantic schema for validating education entries in a LinkedIn profile.
    Ensures proper formatting and validation of educational background.
    """
    institution: str = Field(
        ...,
        min_length=1,
        description="Name of educational institution"
    )
    degree: str = Field(
        ...,
        min_length=1,
        description="Degree or certification obtained"
    )
    field_of_study: Optional[str] = Field(
        None,
        description="Major or field of study"
    )
    start_date: datetime = Field(
        ...,
        description="Start date of education"
    )
    end_date: Optional[datetime] = Field(
        None,
        description="End date of education, None if ongoing"
    )

    @validator('start_date', 'end_date')
    def validate_dates(cls, value, values):
        """
        Validate education date ranges to ensure logical consistency.
        
        Args:
            value: Date value to validate
            values: Dict of previously validated values
            
        Returns:
            datetime: Validated date value
            
        Raises:
            ValueError: If dates are invalid or illogical
        """
        if not value:
            return value

        # Check if date is not in future
        if value > datetime.now():
            raise ValueError("Date cannot be in the future")

        # Check start_date and end_date relationship
        if 'start_date' in values and value and values['start_date']:
            if value < values['start_date']:
                raise ValueError("End date must be after start date")

        return value

class ProfileSchema(BaseModel):
    """
    Main Pydantic schema for validating complete LinkedIn profile data.
    Provides comprehensive validation for all profile components.
    """
    id: UUID = Field(
        ...,
        description="Unique identifier for the profile"
    )
    linkedin_url: str = Field(
        ...,
        description="LinkedIn profile URL"
    )
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Full name of the profile owner"
    )
    headline: Optional[str] = Field(
        None,
        max_length=200,
        description="Professional headline"
    )
    summary: Optional[str] = Field(
        None,
        max_length=2000,
        description="Professional summary"
    )
    location: Optional[str] = Field(
        None,
        max_length=100,
        description="Geographic location"
    )
    experience: List[ProfileExperienceSchema] = Field(
        default_factory=list,
        description="List of professional experiences"
    )
    education: List[ProfileEducationSchema] = Field(
        default_factory=list,
        description="List of educational background"
    )
    skills: List[str] = Field(
        default_factory=list,
        description="Professional skills"
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Professional certifications"
    )
    languages: List[str] = Field(
        default_factory=list,
        description="Language proficiencies"
    )
    created_at: datetime = Field(
        ...,
        description="Profile creation timestamp"
    )
    updated_at: datetime = Field(
        ...,
        description="Profile last update timestamp"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional profile metadata"
    )

    @validator('linkedin_url')
    def validate_linkedin_url(cls, value):
        """
        Validate LinkedIn profile URL format.
        
        Args:
            value: URL string to validate
            
        Returns:
            str: Validated URL
            
        Raises:
            ValueError: If URL format is invalid
        """
        if not value.startswith(('http://linkedin.com/in/', 'https://linkedin.com/in/', 
                               'http://www.linkedin.com/in/', 'https://www.linkedin.com/in/')):
            raise ValueError("Invalid LinkedIn profile URL format")
        return value

    @validator('created_at', 'updated_at')
    def validate_dates(cls, value, values):
        """
        Validate profile timestamps for logical consistency.
        
        Args:
            value: Date value to validate
            values: Dict of previously validated values
            
        Returns:
            datetime: Validated date value
            
        Raises:
            ValueError: If dates are invalid or illogical
        """
        if value > datetime.now():
            raise ValueError("Timestamp cannot be in the future")

        if 'created_at' in values and value and values['created_at']:
            if value < values['created_at']:
                raise ValueError("Updated timestamp must be after created timestamp")

        return value

    class Config:
        """Pydantic model configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }