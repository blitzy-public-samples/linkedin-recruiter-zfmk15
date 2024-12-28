"""
Pydantic schema definitions for AI analysis results validation and serialization.
Provides comprehensive validation rules for Claude AI candidate evaluation results.

Version: 1.0.0
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, validator  # pydantic v2.0.0+

from ..models.analysis_result import AnalysisResult, SkillAnalysis, ExperienceAnalysis

class SkillAnalysisSchema(BaseModel):
    """Pydantic schema for validating skill analysis results with enhanced validation rules."""
    
    skill_name: str = Field(
        ..., 
        min_length=1,
        description="Name of the analyzed skill"
    )
    proficiency_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Normalized proficiency score between 0 and 1"
    )
    years_of_experience: int = Field(
        ...,
        ge=0,
        description="Years of experience with the skill"
    )
    related_experiences: List[str] = Field(
        default_factory=list,
        min_items=0,
        description="List of experiences demonstrating the skill"
    )
    last_used: Optional[str] = Field(
        None,
        pattern=r'^\d{4}-\d{2}$',
        description="Most recent application of the skill (YYYY-MM format)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional skill analysis metadata"
    )

    @validator('proficiency_score')
    def validate_proficiency_score(cls, value: float) -> float:
        """
        Validate proficiency score range with detailed error messages.
        
        Args:
            value: The proficiency score to validate
            
        Returns:
            float: Validated score between 0 and 1
            
        Raises:
            ValueError: If score is outside valid range
        """
        if not 0.0 <= value <= 1.0:
            raise ValueError(
                f"Proficiency score must be between 0 and 1, got {value}"
            )
        return round(value, 3)  # Normalize to 3 decimal places

class ExperienceAnalysisSchema(BaseModel):
    """Pydantic schema for validating experience analysis results with cross-field validation."""
    
    role_relevance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Role relevance score between 0 and 1"
    )
    industry_match_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Industry match score between 0 and 1"
    )
    responsibility_match_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Responsibility match score between 0 and 1"
    )
    key_achievements: List[str] = Field(
        default_factory=list,
        min_items=0,
        description="Key achievements identified in the experience"
    )
    skill_demonstration: Dict[str, float] = Field(
        default_factory=dict,
        description="Mapping of skills to demonstration strength scores"
    )
    context_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context and metadata for the analysis"
    )

    @validator('industry_match_score', 'responsibility_match_score')
    def validate_match_scores(cls, value: float, values: Dict) -> float:
        """
        Validate match score ranges with cross-field validation.
        
        Args:
            value: The match score to validate
            values: Dictionary of previously validated values
            
        Returns:
            float: Validated score between 0 and 1
            
        Raises:
            ValueError: If score is invalid or cross-field validation fails
        """
        if not 0.0 <= value <= 1.0:
            raise ValueError(f"Match score must be between 0 and 1, got {value}")

        # Cross-field validation with role_relevance_score
        if 'role_relevance_score' in values:
            role_score = values['role_relevance_score']
            if abs(value - role_score) > 0.5:
                raise ValueError(
                    f"Match score {value} deviates too much from role relevance score {role_score}"
                )
        
        return round(value, 3)  # Normalize to 3 decimal places

class AnalysisResultSchema(BaseModel):
    """Main Pydantic schema for validating complete analysis results with comprehensive validation."""
    
    id: UUID = Field(
        ...,
        description="Unique identifier for the analysis result"
    )
    profile_id: UUID = Field(
        ...,
        description="Reference to the analyzed LinkedIn profile"
    )
    overall_match_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall candidate match score between 0 and 1"
    )
    skill_analysis: List[SkillAnalysisSchema] = Field(
        ...,
        min_items=1,
        description="Detailed skill-level analysis results"
    )
    experience_analysis: List[ExperienceAnalysisSchema] = Field(
        ...,
        min_items=1,
        description="Experience-level analysis results"
    )
    competency_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Scores for key competency areas"
    )
    strengths: List[str] = Field(
        default_factory=list,
        min_items=0,
        description="Identified candidate strengths"
    )
    areas_of_improvement: List[str] = Field(
        default_factory=list,
        min_items=0,
        description="Potential areas for improvement"
    )
    ai_insights: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional AI-generated insights"
    )
    analyzed_at: datetime = Field(
        ...,
        description="Timestamp when analysis was performed"
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall confidence in analysis results"
    )
    validation_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata about validation process"
    )

    @validator('overall_match_score', 'confidence_score')
    def validate_scores(cls, value: float, values: Dict) -> float:
        """
        Validate overall and confidence scores with relationship checks.
        
        Args:
            value: The score to validate
            values: Dictionary of previously validated values
            
        Returns:
            float: Validated score between 0 and 1
            
        Raises:
            ValueError: If score is invalid or validation fails
        """
        if not 0.0 <= value <= 1.0:
            raise ValueError(f"Score must be between 0 and 1, got {value}")

        # Additional validation for confidence score
        if 'confidence_score' in values and value > values['confidence_score']:
            raise ValueError(
                f"Overall match score {value} cannot exceed confidence score {values['confidence_score']}"
            )

        # Enforce minimum confidence threshold
        if 'confidence_score' in values and values['confidence_score'] < 0.5:
            raise ValueError(
                f"Confidence score {values['confidence_score']} below minimum threshold of 0.5"
            )

        return round(value, 3)  # Normalize to 3 decimal places

    @validator('analyzed_at')
    def validate_analyzed_at(cls, value: datetime) -> datetime:
        """
        Validate analysis timestamp with timezone awareness.
        
        Args:
            value: The timestamp to validate
            
        Returns:
            datetime: Validated timezone-aware timestamp
            
        Raises:
            ValueError: If timestamp is invalid
        """
        if value.tzinfo is None:
            raise ValueError("Timestamp must be timezone-aware")
            
        if value > datetime.now(value.tzinfo):
            raise ValueError("Analysis timestamp cannot be in the future")
            
        return value

    class Config:
        """Pydantic model configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: str
        }