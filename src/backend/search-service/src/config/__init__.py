"""
Configuration initialization module for the LinkedIn Profile Search Service.
Aggregates and exposes configuration settings for LinkedIn API, logging, and service parameters.

External Dependencies:
- os==3.11+

Internal Dependencies:
- linkedin_config: LinkedIn API configuration and authentication
- logging_config: Logging setup and correlation tracking

Author: LinkedIn Profile Search System Team
Version: 1.0.0
"""

import os
from typing import Dict, Any

# Import configuration modules
from .linkedin_config import (
    LINKEDIN_API_KEY,
    LINKEDIN_API_SECRET, 
    LINKEDIN_API_URL,
    load_config as load_linkedin_config
)
from .logging_config import (
    setup_logging,
    get_logger,
    LOG_LEVEL
)

# Service constants
SERVICE_NAME = 'search-service'
SERVICE_VERSION = '1.0.0'
ENV = os.getenv('ENV', 'development')

# Initialize logger for this module
logger = get_logger(__name__)

def initialize_config() -> Dict[str, Any]:
    """
    Initializes all configuration settings for the search service.
    Aggregates LinkedIn API, logging, and service-level configuration.
    
    Returns:
        Dict[str, Any]: Consolidated configuration dictionary containing:
            - Service information
            - Environment settings
            - LinkedIn API configuration
            - Logging configuration
            
    Raises:
        ValueError: If required configuration values are missing
        RuntimeError: If configuration initialization fails
    """
    try:
        logger.info(
            "Initializing search service configuration",
            extra={
                "service": SERVICE_NAME,
                "version": SERVICE_VERSION,
                "environment": ENV
            }
        )

        # Initialize logging first
        setup_logging()
        logger.debug("Logging configuration initialized")

        # Load LinkedIn API configuration
        linkedin_config = load_linkedin_config()
        logger.debug("LinkedIn API configuration loaded")

        # Construct complete configuration
        config = {
            # Service information
            "service": {
                "name": SERVICE_NAME,
                "version": SERVICE_VERSION,
                "environment": ENV
            },
            
            # LinkedIn API settings
            "linkedin_api": linkedin_config,
            
            # Logging configuration
            "logging": {
                "level": LOG_LEVEL,
                "correlation_tracking": True,
                "json_formatting": True
            },
            
            # Service limits and thresholds
            "limits": {
                "max_concurrent_searches": int(os.getenv("MAX_CONCURRENT_SEARCHES", "100")),
                "max_profiles_per_search": int(os.getenv("MAX_PROFILES_PER_SEARCH", "1000")),
                "request_timeout_seconds": int(os.getenv("REQUEST_TIMEOUT", "30"))
            },
            
            # Feature flags
            "features": {
                "enable_caching": os.getenv("ENABLE_CACHING", "true").lower() == "true",
                "enable_rate_limiting": os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true",
                "enable_metrics": os.getenv("ENABLE_METRICS", "true").lower() == "true"
            }
        }

        # Validate complete configuration
        if not _validate_config(config):
            raise ValueError("Invalid service configuration")

        logger.info(
            "Search service configuration initialized successfully",
            extra={"config_keys": list(config.keys())}
        )

        return config

    except Exception as e:
        logger.error(
            "Failed to initialize service configuration",
            extra={"error": str(e)},
            exc_info=True
        )
        raise RuntimeError(f"Configuration initialization failed: {str(e)}")

def _validate_config(config: Dict[str, Any]) -> bool:
    """
    Validates the complete service configuration.
    
    Args:
        config (Dict[str, Any]): Configuration dictionary to validate
        
    Returns:
        bool: True if configuration is valid, False otherwise
    """
    try:
        # Validate service information
        if not all([
            config["service"]["name"],
            config["service"]["version"],
            config["service"]["environment"]
        ]):
            logger.error("Missing required service information")
            return False

        # Validate LinkedIn API configuration
        if not config.get("linkedin_api"):
            logger.error("Missing LinkedIn API configuration")
            return False

        # Validate limits
        limits = config.get("limits", {})
        if not all(isinstance(v, int) for v in limits.values()):
            logger.error("Invalid limit values")
            return False

        # Validate features
        features = config.get("features", {})
        if not all(isinstance(v, bool) for v in features.values()):
            logger.error("Invalid feature flag values")
            return False

        return True

    except Exception as e:
        logger.error(
            "Configuration validation failed",
            extra={"error": str(e)},
            exc_info=True
        )
        return False

# Export public interface
__all__ = [
    'initialize_config',
    'SERVICE_NAME',
    'SERVICE_VERSION',
    'ENV',
    # Re-export LinkedIn configuration
    'LINKEDIN_API_KEY',
    'LINKEDIN_API_SECRET',
    'LINKEDIN_API_URL',
    'load_linkedin_config',
    # Re-export logging configuration
    'setup_logging',
    'get_logger',
    'LOG_LEVEL'
]