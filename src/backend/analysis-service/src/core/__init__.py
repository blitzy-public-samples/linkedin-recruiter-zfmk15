"""
Core module initialization file for LinkedIn profile analysis service.
Exposes main components for AI-powered profile analysis, skill matching,
and analysis orchestration.

This module provides enterprise-grade implementations for:
- Claude AI integration for intelligent profile analysis
- ML-based skill matching and gap analysis 
- Comprehensive profile analysis with scoring
- Analysis workflow orchestration

Version: 1.0.0
"""

# Import core components
from .claude_client import ClaudeClient
from .skill_matcher import SkillMatcher
from .profile_analyzer import ProfileAnalyzer
from .analysis_engine import AnalysisEngine

# Version info
__version__ = '1.0.0'

# Export public interface
__all__ = [
    'ClaudeClient',
    'SkillMatcher', 
    'ProfileAnalyzer',
    'AnalysisEngine'
]

# Module documentation
COMPONENT_DESCRIPTIONS = {
    'ClaudeClient': 'Enterprise-grade async client for Claude AI profile analysis',
    'SkillMatcher': 'ML-based skill matching engine with gap analysis',
    'ProfileAnalyzer': 'Comprehensive profile analysis with scoring',
    'AnalysisEngine': 'Analysis workflow orchestration engine'
}

# Component version requirements
COMPONENT_VERSIONS = {
    'claude_client': '1.0.0',
    'skill_matcher': '1.0.0', 
    'profile_analyzer': '1.0.0',
    'analysis_engine': '1.0.0'
}

# Validate component versions
def validate_versions():
    """Validate that all component versions match requirements."""
    from .claude_client import __version__ as claude_version
    from .skill_matcher import __version__ as matcher_version
    from .profile_analyzer import __version__ as analyzer_version
    from .analysis_engine import __version__ as engine_version
    
    versions = {
        'claude_client': claude_version,
        'skill_matcher': matcher_version,
        'profile_analyzer': analyzer_version,
        'analysis_engine': engine_version
    }
    
    for component, required_version in COMPONENT_VERSIONS.items():
        if versions[component] != required_version:
            raise ImportError(
                f"Version mismatch for {component}: "
                f"required={required_version}, found={versions[component]}"
            )

# Validate versions on import
validate_versions()