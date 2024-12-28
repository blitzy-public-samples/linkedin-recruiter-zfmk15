"""
Core data model representing a LinkedIn profile with comprehensive validation and type safety.
Provides structured access to profile data and helper methods for AI analysis.

Version: 1.0.0
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field  # pydantic v2.0.0+

class ProfileExperience(BaseModel):
    """Represents a work experience entry in a LinkedIn profile with comprehensive validation."""
    
    company_name: str = Field(..., min_length=1, description="Name of the company")
    title: str = Field(..., min_length=1, description="Job title")
    description: str = Field(..., min_length=0, description="Role description")
    start_date: datetime = Field(..., description="Start date of the role")
    end_date: Optional[datetime] = Field(None, description="End date of the role, None if current")
    location: Optional[str] = Field(None, description="Location of the role")
    skills: List[str] = Field(default_factory=list, description="Skills utilized in the role")
    company_metadata: Optional[Dict[str, Any]] = Field(
        None, 
        description="Additional company-related metadata"
    )

    def duration_months(self) -> int:
        """
        Calculate duration of experience in months with overlap handling.
        
        Returns:
            int: Number of months, rounded to nearest month
        """
        end = self.end_date if self.end_date else datetime.now()
        delta = end - self.start_date
        # Convert days to months (approximate)
        months = int((delta.days + 15) / 30.44)  # Adding 15 days for rounding
        return max(months, 0)  # Ensure non-negative duration

class ProfileEducation(BaseModel):
    """Represents an education entry in a LinkedIn profile with validation."""
    
    institution: str = Field(..., min_length=1, description="Educational institution name")
    degree: str = Field(..., min_length=1, description="Degree obtained or pursued")
    field_of_study: Optional[str] = Field(None, description="Field or major of study")
    start_date: datetime = Field(..., description="Start date of education")
    end_date: Optional[datetime] = Field(None, description="End date of education")
    grade: Optional[float] = Field(None, ge=0, le=4.0, description="Grade point average or equivalent")
    activities: Optional[List[str]] = Field(
        default_factory=list,
        description="Educational activities and achievements"
    )
    education_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional education-related metadata"
    )

    def is_completed(self) -> bool:
        """
        Check if education is completed based on end_date.
        
        Returns:
            bool: True if end_date exists and is in the past
        """
        if not self.end_date:
            return False
        return self.end_date < datetime.now()

class Profile(BaseModel):
    """Main model representing a LinkedIn profile with all its components and validation."""
    
    id: UUID = Field(..., description="Unique identifier for the profile")
    linkedin_url: str = Field(..., regex=r'^https:\/\/[w]{0,3}\.?linkedin\.com\/.*$')
    full_name: str = Field(..., min_length=1, max_length=100)
    headline: Optional[str] = Field(None, max_length=200)
    summary: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=100)
    experience: List[ProfileExperience] = Field(
        default_factory=list,
        description="List of work experiences"
    )
    education: List[ProfileEducation] = Field(
        default_factory=list,
        description="List of educational background"
    )
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional profile metadata"
    )
    skill_endorsements: Optional[Dict[str, float]] = Field(
        None,
        description="Skill endorsement counts and weights"
    )
    ai_analysis_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="AI analysis results and metadata"
    )

    def get_total_experience(self) -> int:
        """
        Calculate total work experience in months with overlap handling.
        
        Returns:
            int: Total months of unique experience
        """
        if not self.experience:
            return 0
            
        # Sort experiences by start date
        sorted_exp = sorted(self.experience, key=lambda x: x.start_date)
        total_months = 0
        current_end = None
        
        for exp in sorted_exp:
            exp_end = exp.end_date if exp.end_date else datetime.now()
            
            if current_end is None:
                # First experience
                total_months += exp.duration_months()
                current_end = exp_end
            else:
                if exp.start_date > current_end:
                    # No overlap
                    total_months += exp.duration_months()
                    current_end = exp_end
                else:
                    # Handle overlap
                    if exp_end > current_end:
                        # Add only the non-overlapping part
                        delta = exp_end - current_end
                        total_months += int((delta.days + 15) / 30.44)
                        current_end = exp_end
                        
        return total_months

    def get_all_skills(self) -> List[str]:
        """
        Get combined list of skills from profile and experiences with deduplication.
        
        Returns:
            List[str]: Deduplicated list of all skills
        """
        # Combine all skills
        all_skills = set(self.skills)
        
        # Add skills from experiences
        for exp in self.experience:
            all_skills.update(exp.skills)
            
        # Normalize and sort
        normalized_skills = sorted(list({
            skill.strip().lower()
            for skill in all_skills
            if skill and skill.strip()
        }))
        
        return normalized_skills

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert profile to dictionary format with proper serialization.
        
        Returns:
            Dict[str, Any]: Complete dictionary representation
        """
        def serialize_datetime(dt: datetime) -> str:
            return dt.isoformat() if dt else None
            
        data = self.model_dump()
        
        # Serialize UUID
        data['id'] = str(self.id)
        
        # Serialize datetime fields
        data['created_at'] = serialize_datetime(self.created_at)
        data['updated_at'] = serialize_datetime(self.updated_at)
        
        # Handle nested objects
        data['experience'] = [exp.model_dump() for exp in self.experience]
        data['education'] = [edu.model_dump() for edu in self.education]
        
        # Serialize nested datetimes
        for exp in data['experience']:
            exp['start_date'] = serialize_datetime(exp['start_date'])
            exp['end_date'] = serialize_datetime(exp['end_date'])
            
        for edu in data['education']:
            edu['start_date'] = serialize_datetime(edu['start_date'])
            edu['end_date'] = serialize_datetime(edu['end_date'])
            
        return data