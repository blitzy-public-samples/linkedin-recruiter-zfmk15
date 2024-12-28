"""
Advanced logging utility module providing structured JSON logging with correlation ID tracking,
ELK Stack integration, and comprehensive observability features for the search service.

External Dependencies:
- logging==3.11+
- python-json-logger==2.0.7
- typing==3.11+
- contextvars==3.11+
- uuid==3.11+

Author: LinkedIn Profile Search System Team
"""

import logging
import uuid
from typing import Optional, Dict, Any
from contextvars import ContextVar
from pythonjsonlogger.jsonlogger import JsonFormatter  # version 2.0.7
from logging import LogRecord
from ..config.logging_config import LOG_LEVEL, LOG_FORMAT

# Initialize context variable for correlation ID tracking
correlation_id: ContextVar[str] = ContextVar('correlation_id', default='')

# Initialize service-wide logger
logger = logging.getLogger('search_service')

# Configure buffering for performance optimization
BUFFER_SIZE: int = 1000
LOG_BUFFER: list = []

class CorrelationIdFilter(logging.Filter):
    """
    Advanced logging filter that enriches log records with correlation IDs and metadata.
    Implements security filtering and context propagation.
    """

    def __init__(self, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Initialize the correlation ID filter with optional metadata.

        Args:
            metadata (Optional[Dict[str, Any]]): Additional metadata to include in logs
        """
        super().__init__()
        self.metadata = metadata or {}
        
        # Security sensitive fields that should be filtered
        self._sensitive_fields = {
            'password', 'token', 'api_key', 'secret', 'authorization',
            'access_token', 'refresh_token'
        }

    def filter(self, record: LogRecord) -> bool:
        """
        Enrich log records with correlation ID and metadata while applying security filters.

        Args:
            record (LogRecord): The log record to be enriched

        Returns:
            bool: Always True to include the record
        """
        # Add correlation ID
        current_correlation_id = get_correlation_id()
        record.correlation_id = current_correlation_id or 'NO_CORRELATION_ID'

        # Add environment information
        record.environment = LOG_FORMAT.get('environment', 'development')
        record.service = 'search_service'
        record.version = '1.0.0'  # Should be synchronized with service version

        # Add request context if available
        if hasattr(record, 'request'):
            # Filter sensitive information
            filtered_request = self._filter_sensitive_data(record.request)
            record.request = filtered_request

        # Add custom metadata
        for key, value in self.metadata.items():
            setattr(record, key, value)

        return True

    def _filter_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter out sensitive information from log data.

        Args:
            data (Dict[str, Any]): Data to be filtered

        Returns:
            Dict[str, Any]: Filtered data
        """
        filtered_data = {}
        for key, value in data.items():
            if key.lower() in self._sensitive_fields:
                filtered_data[key] = '[REDACTED]'
            else:
                filtered_data[key] = value
        return filtered_data

def get_correlation_id() -> str:
    """
    Retrieve the current correlation ID from context.

    Returns:
        str: Current correlation ID or empty string if not set
    """
    try:
        return correlation_id.get()
    except LookupError:
        return ''

def set_correlation_id(new_correlation_id: str) -> None:
    """
    Set a new correlation ID in the current context.

    Args:
        new_correlation_id (str): The correlation ID to set

    Raises:
        ValueError: If correlation ID format is invalid
    """
    if not new_correlation_id or not isinstance(new_correlation_id, str):
        raise ValueError("Correlation ID must be a non-empty string")
    
    correlation_id.set(new_correlation_id)
    
    # Update logging context
    logger.debug(
        "Correlation ID set",
        extra={
            'correlation_id': new_correlation_id,
            'event': 'correlation_id_set'
        }
    )

def generate_correlation_id() -> str:
    """
    Generate a new unique correlation ID with service prefix.

    Returns:
        str: New UUID-based correlation ID
    """
    return f"search-svc-{str(uuid.uuid4())}"

def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance with enhanced features.

    Args:
        name (str): Name for the logger instance

    Returns:
        logging.Logger: Configured logger instance
    """
    # Get logger instance
    logger_instance = logging.getLogger(name)
    
    # Configure JSON formatter
    json_formatter = JsonFormatter(
        fmt='%(asctime)s %(levelname)s %(name)s %(correlation_id)s '
            '%(message)s %(pathname)s %(lineno)d %(process)d %(thread)d',
        json_ensure_ascii=False,
        timestamp=True
    )

    # Configure handler
    handler = logging.StreamHandler()
    handler.setFormatter(json_formatter)
    
    # Add correlation ID filter
    correlation_filter = CorrelationIdFilter()
    handler.addFilter(correlation_filter)
    
    # Set log level
    logger_instance.setLevel(LOG_LEVEL)
    
    # Add handler if not already present
    if not logger_instance.handlers:
        logger_instance.addHandler(handler)
    
    # Configure error handling
    def handle_error(record: LogRecord) -> None:
        """Handle logging errors."""
        logger_instance.error(
            "Error processing log record",
            extra={
                'correlation_id': get_correlation_id(),
                'error_record': str(record),
                'event': 'logging_error'
            }
        )
    
    handler.handleError = handle_error
    
    return logger_instance

# Export public interface
__all__ = [
    'get_logger',
    'get_correlation_id',
    'set_correlation_id',
    'generate_correlation_id'
]