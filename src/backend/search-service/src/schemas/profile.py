"""
Pydantic schema definitions for LinkedIn profile data validation and serialization.
Provides comprehensive validation rules and security measures for profile data structure.

Dependencies:
pydantic==2.0.0
"""

import re
from datetime import datetime
from typing import List, Optional, Dict, Any, UUID
from pydantic import BaseModel, Field, validator

class ProfileExperienceSchema(BaseModel):
    """Pydantic schema for validating work experience entries with enhanced validation rules."""
    
    company_name: str = Field(..., min_length=1, max_length=200)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    start_date: datetime = Field(...)
    end_date: Optional[datetime] = Field(None)
    location: Optional[str] = Field(None, max_length=200)
    skills: List[str] = Field(default_factory=list)
    company_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('start_date')
    def validate_start_date(cls, v):
        if v > datetime.now():
            raise ValueError("Start date cannot be in the future")
        return v

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values:
            if v < values['start_date']:
                raise ValueError("End date must be after start date")
            if v > datetime.now():
                raise ValueError("End date cannot be in the future")
            # Validate maximum experience duration (e.g., 50 years)
            duration = (v - values['start_date']).days / 365.25
            if duration > 50:
                raise ValueError("Experience duration exceeds maximum allowed (50 years)")
        return v

    @validator('company_metadata')
    def validate_company_metadata(cls, v):
        if v:
            allowed_keys = {'size', 'industry', 'location', 'url', 'type'}
            if not all(key in allowed_keys for key in v.keys()):
                raise ValueError(f"Invalid company metadata keys. Allowed keys: {allowed_keys}")
            
            if 'url' in v:
                url_pattern = r'^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/\S*)?$'
                if not re.match(url_pattern, v['url']):
                    raise ValueError("Invalid company URL format")
                
            if 'size' in v and not isinstance(v['size'], str):
                raise ValueError("Company size must be a string")
        return v

class ProfileEducationSchema(BaseModel):
    """Pydantic schema for validating education entries with enhanced validation."""
    
    institution: str = Field(..., min_length=1, max_length=200)
    degree: str = Field(..., min_length=1, max_length=200)
    field_of_study: Optional[str] = Field(None, max_length=200)
    start_date: datetime = Field(...)
    end_date: Optional[datetime] = Field(None)
    grade: Optional[float] = Field(None, ge=0.0, le=4.0)
    activities: Optional[List[str]] = Field(default_factory=list)
    institution_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('start_date')
    def validate_start_date(cls, v):
        if v > datetime.now():
            raise ValueError("Start date cannot be in the future")
        return v

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values:
            if v < values['start_date']:
                raise ValueError("End date must be after start date")
            if v > datetime.now():
                raise ValueError("End date cannot be in the future")
            # Validate maximum education duration (e.g., 10 years)
            duration = (v - values['start_date']).days / 365.25
            if duration > 10:
                raise ValueError("Education duration exceeds maximum allowed (10 years)")
        return v

    @validator('institution_metadata')
    def validate_institution_metadata(cls, v):
        if v:
            allowed_keys = {'type', 'location', 'accreditation', 'url', 'ranking'}
            if not all(key in allowed_keys for key in v.keys()):
                raise ValueError(f"Invalid institution metadata keys. Allowed keys: {allowed_keys}")
            
            if 'url' in v:
                url_pattern = r'^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/\S*)?$'
                if not re.match(url_pattern, v['url']):
                    raise ValueError("Invalid institution URL format")
                
            if 'ranking' in v and not isinstance(v['ranking'], (int, float)):
                raise ValueError("Institution ranking must be a number")
        return v

class ProfileSchema(BaseModel):
    """Main Pydantic schema for validating complete LinkedIn profile data with comprehensive validation."""
    
    id: UUID = Field(...)
    linkedin_url: str = Field(..., max_length=500)
    full_name: str = Field(..., min_length=1, max_length=200)
    headline: Optional[str] = Field(None, max_length=500)
    summary: Optional[str] = Field(None, max_length=5000)
    location: Optional[str] = Field(None, max_length=200)
    experience: List[ProfileExperienceSchema] = Field(default_factory=list)
    education: List[ProfileEducationSchema] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    search_metadata: Optional[Dict[str, str]] = Field(default_factory=dict)
    profile_completeness_score: Optional[float] = Field(None, ge=0.0, le=1.0)

    @validator('linkedin_url')
    def validate_linkedin_url(cls, v):
        url_pattern = r'^https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]{3,100}(?:\/)?$'
        if not re.match(url_pattern, v):
            raise ValueError("Invalid LinkedIn profile URL format")
        
        # Security checks
        if len(v) > 500:
            raise ValueError("LinkedIn URL exceeds maximum length")
        if re.search(r'<|>|javascript:|data:', v, re.IGNORECASE):
            raise ValueError("LinkedIn URL contains potentially malicious content")
        return v

    @validator('skills')
    def validate_skills(cls, v):
        if len(v) > 100:
            raise ValueError("Number of skills exceeds maximum allowed (100)")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in v:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)
        
        # Validate skill format
        skill_pattern = r'^[a-zA-Z0-9\s\-\+\#\.\,\/\(\)]{1,100}$'
        for skill in unique_skills:
            if not re.match(skill_pattern, skill):
                raise ValueError(f"Invalid skill format: {skill}")
        
        return unique_skills

    @validator('updated_at')
    def validate_dates(cls, v, values):
        if 'created_at' in values and v < values['created_at']:
            raise ValueError("Updated date cannot be before created date")
        return v

    def calculate_profile_completeness(self) -> float:
        """Calculate profile completeness score based on field presence and quality."""
        score = 0.0
        weights = {
            'full_name': 0.1,
            'headline': 0.05,
            'summary': 0.1,
            'location': 0.05,
            'experience': 0.3,
            'education': 0.2,
            'skills': 0.1,
            'certifications': 0.05,
            'languages': 0.05
        }
        
        # Required fields
        if self.full_name:
            score += weights['full_name']
        if self.headline:
            score += weights['headline']
        if self.summary and len(self.summary) > 100:
            score += weights['summary']
        if self.location:
            score += weights['location']
            
        # Experience entries
        if self.experience:
            exp_score = min(len(self.experience) / 3, 1.0)  # Max score for 3+ experiences
            score += weights['experience'] * exp_score
            
        # Education entries
        if self.education:
            edu_score = min(len(self.education) / 2, 1.0)  # Max score for 2+ education entries
            score += weights['education'] * edu_score
            
        # Skills
        if self.skills:
            skills_score = min(len(self.skills) / 10, 1.0)  # Max score for 10+ skills
            score += weights['skills'] * skills_score
            
        # Additional fields
        if self.certifications:
            score += weights['certifications']
        if self.languages:
            score += weights['languages']
            
        return round(min(score, 1.0), 2)

    class Config:
        validate_assignment = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }