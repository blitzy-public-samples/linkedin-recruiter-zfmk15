"""
Logging configuration module for the analysis service.

This module provides logging configuration with ELK Stack integration, structured JSON logging,
enhanced security features, and correlation tracking capabilities. It follows enterprise logging
best practices and ensures compliance with monitoring requirements.

Version: 1.0.0
"""

import logging
import logging.config
import json
import os
from typing import Dict, Optional
from typing_extensions import TypedDict
from pythonjsonlogger import jsonlogger  # version: 2.0.7

# Global logging configuration
LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
SERVICE_NAME: str = 'analysis-service'

# Valid logging levels mapping
VALID_LOG_LEVELS: Dict[str, int] = {
    'DEBUG': logging.DEBUG,
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL
}

# Type definition for log format configuration
class LogFormatConfig(TypedDict):
    version: int
    disable_existing_loggers: bool
    formatters: Dict
    filters: Dict
    handlers: Dict
    root: Dict

# Logging format configuration with JSON structured logging
LOG_FORMAT: LogFormatConfig = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(correlation_id)s '
                     '%(service)s %(message)s %(stack_trace)s',
            'datefmt': '%Y-%m-%dT%H:%M:%S.%fZ',
            'json_ensure_ascii': False,
            'json_indent': None
        }
    },
    'filters': {
        'correlation_id': {
            '()': 'app.utils.logging_filters.CorrelationIdFilter'
        },
        'pii_filter': {
            '()': 'app.utils.logging_filters.PIIFilter'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['correlation_id', 'pii_filter'],
            'stream': 'ext://sys.stdout'
        }
    },
    'root': {
        'level': LOG_LEVEL,
        'handlers': ['console'],
        'propagate': True
    }
}

def validate_log_level(level: str) -> str:
    """
    Validates the provided log level against allowed values.

    Args:
        level (str): The logging level to validate

    Returns:
        str: The validated uppercase log level

    Raises:
        ValueError: If an invalid logging level is provided
    """
    normalized_level = level.upper()
    if normalized_level not in VALID_LOG_LEVELS:
        valid_levels = ', '.join(VALID_LOG_LEVELS.keys())
        raise ValueError(
            f"Invalid log level: {level}. Valid levels are: {valid_levels}"
        )
    return normalized_level

def setup_logging() -> None:
    """
    Configures global logging settings for the analysis service.
    
    This function sets up structured JSON logging with ELK Stack integration,
    correlation ID tracking, and PII data filtering. It configures console
    output with the specified format and handles any configuration errors.

    Raises:
        Exception: If logging configuration fails
    """
    try:
        # Validate configured log level
        validated_level = validate_log_level(LOG_LEVEL)
        LOG_FORMAT['root']['level'] = validated_level

        # Add service name to logging context
        logging.getLogger().service = SERVICE_NAME

        # Apply logging configuration
        logging.config.dictConfig(LOG_FORMAT)

        # Log startup message
        logger = logging.getLogger(__name__)
        logger.info(
            "Logging configuration initialized",
            extra={
                'service': SERVICE_NAME,
                'log_level': validated_level,
                'handlers': list(LOG_FORMAT['handlers'].keys()),
                'filters': list(LOG_FORMAT['filters'].keys())
            }
        )

    except Exception as e:
        # Fallback to basic logging if configuration fails
        logging.basicConfig(level=logging.ERROR)
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to configure logging: {str(e)}",
            exc_info=True,
            extra={'service': SERVICE_NAME}
        )
        raise