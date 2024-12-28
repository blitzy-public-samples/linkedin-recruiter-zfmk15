"""
Configuration initialization module for the Analysis Service.

This module centralizes and securely exposes validated configuration settings and utilities
for the Analysis Service, including Claude AI integration and ELK Stack logging configurations.
Implements comprehensive validation, security controls, and audit capabilities.

Version: 1.0.0
"""

from .claude_config import (  # version: 1.0.0
    ClaudeConfig,
    get_claude_config,
)
from .logging_config import (  # version: 1.0.0
    setup_logging,
    LOG_LEVEL,
    LOG_FORMAT,
)

# Initialize logging configuration on module import
setup_logging()

# Initialize Claude configuration with validation
try:
    claude_config = get_claude_config()
except Exception as e:
    # Log error but don't prevent module from loading
    # Other components may still function without Claude
    from ..utils.logger import get_logger
    logger = get_logger(__name__)
    logger.error(
        "Failed to initialize Claude configuration",
        extra={
            "error": str(e),
            "component": "config_init",
            "impact": "claude_ai_disabled"
        },
        exc_info=True
    )
    claude_config = None

# Module version
__version__ = "1.0.0"

# Public interface
__all__ = [
    # Claude AI configuration
    'ClaudeConfig',
    'get_claude_config',
    'claude_config',
    
    # Logging configuration
    'setup_logging',
    'LOG_LEVEL',
    'LOG_FORMAT',
    
    # Version info
    '__version__'
]

# Configuration validation status
config_status = {
    "logging_initialized": True,
    "claude_available": claude_config is not None,
    "log_level": LOG_LEVEL,
    "version": __version__
}

# Log configuration status
logger = get_logger(__name__)
logger.info(
    "Analysis service configuration initialized",
    extra={
        "config_status": config_status,
        "claude_config_valid": bool(claude_config),
        "log_format": "json",
        "service": "analysis-service"
    }
)