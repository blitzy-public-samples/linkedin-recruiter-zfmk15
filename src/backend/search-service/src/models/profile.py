"""
Profile data models for LinkedIn profile data with enhanced search and privacy features.
Provides structured representation of profile data with validation and business logic.

Dependencies:
pydantic==2.0.0
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field

class ProfileExperience(BaseModel):
    """Represents a work experience entry in a LinkedIn profile with enhanced duration calculation."""
    
    company_name: str = Field(..., description="Name of the company")
    title: str = Field(..., description="Job title")
    description: Optional[str] = Field(None, description="Role description")
    start_date: datetime = Field(..., description="Start date of the role")
    end_date: Optional[datetime] = Field(None, description="End date of the role, None if current")
    location: Optional[str] = Field(None, description="Job location")
    skills: List[str] = Field(default_factory=list, description="Skills utilized in the role")
    employment_type: Optional[str] = Field(None, description="Full-time, Part-time, Contract, etc.")
    is_internship: bool = Field(False, description="Whether the role was an internship")
    time_commitment_ratio: float = Field(1.0, description="Time commitment ratio (1.0 for full-time)")

    def get_duration(self) -> float:
        """Calculate the weighted duration of the experience considering employment type."""
        end = self.end_date or datetime.now()
        duration_days = (end - self.start_date).days
        duration_years = duration_days / 365.25
        
        # Apply time commitment weighting
        weighted_duration = duration_years * self.time_commitment_ratio
        
        # Apply internship weighting if applicable
        if self.is_internship:
            weighted_duration *= 0.5  # Weight internships at 50%
            
        return round(weighted_duration, 2)

class ProfileEducation(BaseModel):
    """Represents an education entry in a LinkedIn profile."""
    
    institution: str = Field(..., description="Educational institution name")
    degree: str = Field(..., description="Degree obtained or pursued")
    field_of_study: Optional[str] = Field(None, description="Field of study/major")
    start_date: datetime = Field(..., description="Start date of education")
    end_date: Optional[datetime] = Field(None, description="End date of education, None if current")
    grade: Optional[float] = Field(None, description="Grade/GPA if available")
    activities: Optional[List[str]] = Field(default_factory=list, description="Educational activities")
    courses: Optional[List[str]] = Field(default_factory=list, description="Relevant courses")

    def get_duration(self) -> float:
        """Calculate the duration of education in years."""
        end = self.end_date or datetime.now()
        duration_days = (end - self.start_date).days
        return round(duration_days / 365.25, 2)

class Profile(BaseModel):
    """Main profile model representing a LinkedIn profile with enhanced search and privacy features."""
    
    id: UUID = Field(..., description="Unique identifier for the profile")
    linkedin_url: str = Field(..., description="LinkedIn profile URL")
    full_name: str = Field(..., description="Full name of the person")
    headline: Optional[str] = Field(None, description="Professional headline")
    summary: Optional[str] = Field(None, description="Professional summary")
    location: Optional[str] = Field(None, description="Current location")
    experience: List[ProfileExperience] = Field(default_factory=list, description="Work experience entries")
    education: List[ProfileEducation] = Field(default_factory=list, description="Education entries")
    skills: List[str] = Field(default_factory=list, description="Professional skills")
    categorized_skills: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Skills categorized by type (technical, soft, etc.)"
    )
    certifications: List[str] = Field(default_factory=list, description="Professional certifications")
    languages: List[str] = Field(default_factory=list, description="Known languages")
    created_at: datetime = Field(default_factory=datetime.now, description="Profile creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    search_metadata: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Search optimization metadata"
    )
    profile_completeness_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Profile completeness score (0-1)"
    )
    last_activity_date: datetime = Field(
        default_factory=datetime.now,
        description="Last activity timestamp"
    )
    verification_status: str = Field(
        default="unverified",
        description="Profile verification status"
    )
    privacy_settings: Dict[str, Any] = Field(
        default_factory=dict,
        description="Privacy and visibility settings"
    )
    data_retention_metadata: Dict[str, datetime] = Field(
        default_factory=dict,
        description="Data retention and compliance metadata"
    )

    def get_total_experience(self) -> float:
        """Calculate total years of professional experience with sophisticated overlap handling."""
        if not self.experience:
            return 0.0
            
        # Sort experiences chronologically
        sorted_exp = sorted(self.experience, key=lambda x: x.start_date)
        total_duration = 0.0
        current_end = sorted_exp[0].start_date
        
        for exp in sorted_exp:
            if exp.start_date > current_end:
                # No overlap, add full duration
                total_duration += exp.get_duration()
                current_end = exp.end_date or datetime.now()
            else:
                # Handle overlap
                overlap_start = max(exp.start_date, current_end)
                exp_end = exp.end_date or datetime.now()
                if exp_end > current_end:
                    # Add only non-overlapping portion
                    overlap_duration = (exp_end - overlap_start).days / 365.25
                    total_duration += overlap_duration * exp.time_commitment_ratio
                    current_end = exp_end
                    
        return round(total_duration, 2)

    def get_latest_experience(self, exclude_internships: bool = True) -> Optional[ProfileExperience]:
        """Get the most recent work experience."""
        if not self.experience:
            return None
            
        filtered_exp = [
            exp for exp in self.experience 
            if not (exclude_internships and exp.is_internship)
        ]
        
        if not filtered_exp:
            return None
            
        return max(
            filtered_exp,
            key=lambda x: x.end_date or datetime.now()
        )

    def get_latest_education(self) -> Optional[ProfileEducation]:
        """Get the most recent education entry."""
        if not self.education:
            return None
            
        return max(
            self.education,
            key=lambda x: x.end_date or datetime.now()
        )

    def to_search_document(self) -> Dict[str, Any]:
        """Convert profile to search engine document format with enhanced relevance scoring."""
        latest_exp = self.get_latest_experience()
        latest_edu = self.get_latest_education()
        
        search_doc = {
            "id": str(self.id),
            "linkedin_url": self.linkedin_url,
            "full_name": self.full_name,
            "headline": self.headline,
            "location": self.location,
            "total_experience": self.get_total_experience(),
            "skills": self.skills,
            "categorized_skills": self.categorized_skills,
            "current_company": latest_exp.company_name if latest_exp else None,
            "current_title": latest_exp.title if latest_exp else None,
            "highest_education": {
                "institution": latest_edu.institution if latest_edu else None,
                "degree": latest_edu.degree if latest_edu else None,
                "field": latest_edu.field_of_study if latest_edu else None
            },
            "certifications": self.certifications,
            "languages": self.languages,
            "profile_completeness": self.profile_completeness_score,
            "last_activity": self.last_activity_date.isoformat(),
            "verification_status": self.verification_status,
            "search_boost": self._calculate_search_boost()
        }
        
        # Apply privacy filters
        if self.privacy_settings.get("hide_details", False):
            search_doc.pop("linkedin_url", None)
            search_doc["full_name"] = f"{self.full_name[:1]}***"
        
        return search_doc

    def _calculate_search_boost(self) -> float:
        """Calculate search relevance boost based on profile quality."""
        boost = 1.0
        
        # Boost for profile completeness
        boost *= (1 + self.profile_completeness_score)
        
        # Boost for verification status
        if self.verification_status == "verified":
            boost *= 1.2
            
        # Boost for recent activity
        days_since_activity = (datetime.now() - self.last_activity_date).days
        if days_since_activity < 30:
            boost *= 1.1
            
        return round(boost, 2)