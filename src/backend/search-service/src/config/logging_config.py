"""
Logging configuration module providing structured JSON logging with ELK Stack integration.
Implements correlation tracking and configurable log levels for the search service.

External Dependencies:
- logging==3.11+
- python-json-logger==2.0.7
"""

import logging
import logging.config
import os
import json
import sys
from pythonjsonlogger import jsonlogger  # version 2.0.7

# Global configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
VALID_LOG_LEVELS = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}

# Logging format configuration
LOG_FORMAT = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(correlation_id)s '
                     '%(message)s %(pathname)s %(lineno)d %(process)d '
                     '%(thread)d %(exc_info)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
            'json_ensure_ascii': False
        }
    },
    'filters': {
        'correlation_id': {
            '()': 'app.middleware.CorrelationIdFilter'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['correlation_id'],
            'stream': 'ext://sys.stdout'
        }
    },
    'root': {
        'level': 'LOG_LEVEL',
        'handlers': ['console'],
        'propagate': True
    }
}

def validate_log_level(log_level: str) -> str:
    """
    Validates the provided log level against allowed values.
    
    Args:
        log_level (str): The log level to validate
        
    Returns:
        str: Validated log level string
        
    Raises:
        None - defaults to INFO if invalid level provided
    """
    normalized_level = log_level.upper()
    if normalized_level not in VALID_LOG_LEVELS:
        logging.warning(
            f"Invalid log level '{log_level}' provided. Defaulting to INFO.",
            extra={'correlation_id': 'SYSTEM'}
        )
        return 'INFO'
    return normalized_level

def handle_uncaught_exception(exc_type, exc_value, exc_traceback):
    """
    Global exception handler for logging uncaught exceptions.
    
    Args:
        exc_type: Type of the exception
        exc_value: Exception instance
        exc_traceback: Traceback object
        
    Returns:
        None
    """
    # Don't log KeyboardInterrupt
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return

    logger = logging.getLogger(__name__)
    
    # Format exception info
    exc_info = {
        'exc_type': exc_type.__name__,
        'exc_value': str(exc_value),
        'traceback': logging.Formatter().formatException(
            (exc_type, exc_value, exc_traceback)
        )
    }
    
    # Log the exception with correlation ID if available
    logger.critical(
        'Uncaught exception occurred',
        extra={
            'correlation_id': getattr(exc_value, 'correlation_id', 'SYSTEM'),
            'exc_info': json.dumps(exc_info)
        },
        exc_info=(exc_type, exc_value, exc_traceback)
    )

def setup_logging() -> None:
    """
    Configures global logging settings with JSON formatting and ELK Stack integration.
    
    This function:
    - Validates the configured log level
    - Sets up JSON structured logging
    - Configures correlation ID tracking
    - Establishes global exception handling
    
    Returns:
        None
    """
    # Validate log level
    validated_level = validate_log_level(LOG_LEVEL)
    
    # Create a copy of the logging config and update the level
    log_config = LOG_FORMAT.copy()
    log_config['root']['level'] = validated_level
    
    # Configure logging
    logging.config.dictConfig(log_config)
    
    # Set global exception handler
    sys.excepthook = handle_uncaught_exception
    
    # Get root logger
    logger = logging.getLogger()
    
    # Log successful configuration
    logger.info(
        'Logging configuration initialized successfully',
        extra={
            'correlation_id': 'SYSTEM',
            'log_level': validated_level,
            'handlers': list(log_config['handlers'].keys())
        }
    )