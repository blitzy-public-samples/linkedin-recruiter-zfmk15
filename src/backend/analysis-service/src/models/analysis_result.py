"""
Core data model for AI analysis results of LinkedIn profiles with enhanced validation and accuracy metrics.
Provides structured representation of Claude AI's candidate evaluation and scoring.

Version: 1.0.0
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field  # pydantic v2.0.0+

from .profile import Profile  # Internal import for profile data access

class SkillAnalysis(BaseModel):
    """Enhanced model for AI analysis results of individual skills with normalized scoring."""
    
    skill_name: str = Field(..., min_length=1, description="Name of the analyzed skill")
    proficiency_score: float = Field(..., ge=0.0, le=1.0, description="Normalized proficiency score")
    years_of_experience: int = Field(..., ge=0, description="Years of experience with the skill")
    related_experiences: List[str] = Field(
        default_factory=list,
        description="List of experiences demonstrating the skill"
    )
    last_used: Optional[str] = Field(None, description="Most recent application of the skill")
    confidence_metrics: Dict[str, float] = Field(
        default_factory=dict,
        description="Confidence scores for different aspects of skill analysis"
    )
    validation_notes: List[str] = Field(
        default_factory=list,
        description="AI validation notes and observations"
    )

    def calculate_skill_strength(self) -> float:
        """
        Calculate normalized skill strength with confidence weighting.
        
        Returns:
            float: Normalized skill strength score between 0 and 1
        """
        # Normalize years of experience using logarithmic scale
        exp_factor = min(1.0, (self.years_of_experience + 1) / 11)  # Log scale caps at 10 years
        
        # Calculate recency factor based on last_used
        recency_factor = 1.0
        if self.last_used:
            try:
                last_used_date = datetime.strptime(self.last_used, "%Y-%m")
                months_since = (datetime.now() - last_used_date).days / 30.44
                recency_factor = max(0.7, 1 - (months_since / 60))  # Decay over 5 years to 0.7
            except ValueError:
                pass
        
        # Calculate base score with weights
        base_score = (
            0.6 * self.proficiency_score +
            0.4 * exp_factor
        ) * recency_factor
        
        # Apply confidence adjustment
        confidence_avg = (
            sum(self.confidence_metrics.values()) / 
            len(self.confidence_metrics) if self.confidence_metrics else 0.8
        )
        
        return min(1.0, base_score * confidence_avg)

class ExperienceAnalysis(BaseModel):
    """Enhanced model for work experience analysis with detailed matching metrics."""
    
    role_relevance_score: float = Field(..., ge=0.0, le=1.0)
    industry_match_score: float = Field(..., ge=0.0, le=1.0)
    responsibility_match_score: float = Field(..., ge=0.0, le=1.0)
    key_achievements: List[str] = Field(default_factory=list)
    skill_demonstration: Dict[str, float] = Field(
        default_factory=dict,
        description="Mapping of skills to demonstration strength"
    )
    evidence_mapping: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Mapping of claims to supporting evidence"
    )
    confidence_metrics: Dict[str, float] = Field(
        default_factory=dict,
        description="Confidence scores for analysis aspects"
    )

    def get_overall_match(self) -> float:
        """
        Calculate comprehensive experience match score with confidence weighting.
        
        Returns:
            float: Weighted match score between 0 and 1
        """
        # Component weights
        weights = {
            'role': 0.4,
            'industry': 0.3,
            'responsibility': 0.3
        }
        
        # Calculate base component scores
        base_score = (
            weights['role'] * self.role_relevance_score +
            weights['industry'] * self.industry_match_score +
            weights['responsibility'] * self.responsibility_match_score
        )
        
        # Evidence-based adjustment
        evidence_factor = min(1.0, len(self.evidence_mapping) / 5)  # Caps at 5 pieces of evidence
        
        # Calculate confidence adjustment
        confidence_avg = (
            sum(self.confidence_metrics.values()) / 
            len(self.confidence_metrics) if self.confidence_metrics else 0.8
        )
        
        # Apply adjustments
        adjusted_score = base_score * (0.8 + 0.2 * evidence_factor) * confidence_avg
        
        return min(1.0, adjusted_score)

class AnalysisResult(BaseModel):
    """Comprehensive model for complete AI analysis results with enhanced accuracy metrics."""
    
    id: UUID = Field(default_factory=uuid4, description="Unique identifier for analysis result")
    profile_id: UUID = Field(..., description="Reference to analyzed profile")
    overall_match_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Final weighted match score"
    )
    skill_analysis: List[SkillAnalysis] = Field(
        default_factory=list,
        description="Detailed skill-level analysis"
    )
    experience_analysis: List[ExperienceAnalysis] = Field(
        default_factory=list,
        description="Experience-level analysis results"
    )
    competency_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Scores for key competency areas"
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Identified candidate strengths"
    )
    areas_of_improvement: List[str] = Field(
        default_factory=list,
        description="Potential improvement areas"
    )
    ai_insights: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional AI-generated insights"
    )
    analyzed_at: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp of analysis"
    )
    confidence_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Overall confidence in analysis"
    )
    accuracy_metrics: Dict[str, float] = Field(
        default_factory=dict,
        description="Detailed accuracy measurements"
    )
    audit_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Audit trail and metadata"
    )

    def calculate_overall_score(self) -> float:
        """
        Calculate final match score with confidence-weighted components.
        
        Returns:
            float: Confidence-adjusted match score between 0 and 1
        """
        if not self.skill_analysis or not self.experience_analysis:
            return 0.0

        # Calculate skill component
        skill_scores = [
            skill.calculate_skill_strength() 
            for skill in self.skill_analysis
        ]
        avg_skill_score = sum(skill_scores) / len(skill_scores) if skill_scores else 0.0

        # Calculate experience component
        exp_scores = [
            exp.get_overall_match() 
            for exp in self.experience_analysis
        ]
        avg_exp_score = sum(exp_scores) / len(exp_scores) if exp_scores else 0.0

        # Calculate competency component
        avg_competency = (
            sum(self.competency_scores.values()) / 
            len(self.competency_scores) if self.competency_scores else 0.0
        )

        # Component weights
        weights = {
            'skills': 0.4,
            'experience': 0.4,
            'competencies': 0.2
        }

        # Calculate weighted score
        base_score = (
            weights['skills'] * avg_skill_score +
            weights['experience'] * avg_exp_score +
            weights['competencies'] * avg_competency
        )

        # Apply confidence adjustment
        adjusted_score = base_score * self.confidence_score

        # Apply accuracy thresholds
        if self.accuracy_metrics:
            accuracy_factor = sum(self.accuracy_metrics.values()) / len(self.accuracy_metrics)
            adjusted_score *= accuracy_factor

        return min(1.0, adjusted_score)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert analysis result to validated dictionary format.
        
        Returns:
            Dict[str, Any]: Validated dictionary representation
        """
        data = self.model_dump()
        
        # Serialize UUID fields
        data['id'] = str(self.id)
        data['profile_id'] = str(self.profile_id)
        
        # Serialize datetime
        data['analyzed_at'] = self.analyzed_at.isoformat()
        
        # Convert nested models
        data['skill_analysis'] = [
            skill.model_dump() 
            for skill in self.skill_analysis
        ]
        data['experience_analysis'] = [
            exp.model_dump() 
            for exp in self.experience_analysis
        ]
        
        # Add accuracy metadata
        data['accuracy_metrics'] = {
            **self.accuracy_metrics,
            'calculation_timestamp': datetime.now().isoformat()
        }
        
        # Add audit trail
        data['audit_metadata'] = {
            **self.audit_metadata,
            'serialized_at': datetime.now().isoformat(),
            'version': '1.0.0'
        }
        
        return data