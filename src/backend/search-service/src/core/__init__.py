"""
Core module initialization for LinkedIn Profile Search and Analysis System.
Exposes main components for profile searching, data extraction, and processing.

External Dependencies:
- aioredis==2.0.0 (via search_engine.py)
- opentelemetry-api==1.20.0 (via search_engine.py)
- tenacity==8.2.0 (via search_engine.py)
- aiohttp==3.8.0 (via linkedin_client.py)
- backoff==2.2.1 (via linkedin_client.py)
- circuitbreaker==1.4.0 (via linkedin_client.py)
- prometheus_client==0.17.0 (via linkedin_client.py)
- beautifulsoup4==4.12.0 (via profile_extractor.py)
- bleach==6.0.0 (via profile_extractor.py)

Author: LinkedIn Profile Search System Team
"""

import logging
from typing import Optional, Dict, Any

from .linkedin_client import LinkedInClient
from .profile_extractor import ProfileExtractor
from .search_engine import SearchEngine
from ..utils.logger import get_logger

# Initialize module logger
logger = get_logger(__name__)

# Module version
__version__ = "1.0.0"

# Public interface
__all__ = [
    "LinkedInClient",
    "ProfileExtractor", 
    "SearchEngine"
]

def _handle_import_error(error: Exception, module_name: str) -> None:
    """
    Handle import errors with detailed error messages and logging.
    
    Args:
        error (Exception): The import error that occurred
        module_name (str): Name of the module that failed to import
        
    Raises:
        ImportError: Enhanced import error with context
    """
    error_msg = f"Failed to import {module_name}: {str(error)}"
    logger.error(
        error_msg,
        extra={
            "module": module_name,
            "error": str(error),
            "error_type": error.__class__.__name__
        }
    )
    raise ImportError(error_msg) from error

# Verify critical dependencies and configurations
try:
    # Verify LinkedInClient dependencies
    import aiohttp
    import backoff
    import circuitbreaker
    import prometheus_client
    
    # Verify ProfileExtractor dependencies
    import bs4
    import bleach
    
    # Verify SearchEngine dependencies
    import aioredis
    import opentelemetry.trace
    import tenacity
    
except ImportError as e:
    _handle_import_error(e, e.name)

# Initialize default logging level
logging.getLogger(__name__).setLevel(logging.INFO)

logger.info(
    "Core search module initialized successfully",
    extra={
        "version": __version__,
        "components": __all__
    }
)