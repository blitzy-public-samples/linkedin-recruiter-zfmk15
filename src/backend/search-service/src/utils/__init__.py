"""
Utilities package initializer providing centralized access to logging functionality
with ELK Stack integration and correlation tracking capabilities.

This module serves as the main entry point for accessing utility functions across
the search service while maintaining a clean re-export pattern.

External Dependencies:
- logging==3.11+
- python-json-logger==2.0.7
- typing==3.11+
- contextvars==3.11+
- uuid==3.11+

Author: LinkedIn Profile Search System Team
"""

from utils.logger import (
    get_logger,
    set_correlation_id,
    JsonFormatter,
    CorrelationIdFilter,
    generate_correlation_id,
    get_correlation_id
)

# Re-export core logging components for easy access
__all__ = [
    'get_logger',
    'set_correlation_id',
    'JsonFormatter',
    'CorrelationIdFilter',
    'generate_correlation_id',
    'get_correlation_id'
]

# Initialize default logger for the utils package
logger = get_logger(__name__)

# Log package initialization
logger.debug(
    "Utils package initialized",
    extra={
        'correlation_id': 'SYSTEM',
        'event': 'package_init',
        'component': 'utils'
    }
)