"""
Logging utility module for the analysis service.

This module provides structured JSON logging capabilities with correlation ID tracking,
PII filtering, and ELK Stack integration. It implements enterprise-grade security
and compliance features for production use.

Version: 1.0.0
"""

import logging
from typing import Optional, Dict, Any
from contextvars import ContextVar
import uuid
from pythonjsonlogger.jsonlogger import JsonFormatter  # version: 2.0.7
import re
from datetime import datetime, timezone
from logging import LogRecord

from ..config.logging_config import LOG_LEVEL, LOG_FORMAT

# Thread-safe correlation ID context
correlation_id: ContextVar[str] = ContextVar('correlation_id', default='')

# Global logger instance
logger = logging.getLogger('analysis_service')

class CorrelationIdFilter(logging.Filter):
    """
    Logging filter that adds correlation ID and security context to log records.
    Implements PII filtering and compliance metadata.
    """
    
    def __init__(self) -> None:
        """Initialize the correlation ID filter with security context."""
        super().__init__()
        self.pii_patterns = {
            'email': re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
            'phone': re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
            'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
        }
        self.security_context = {
            'service': 'analysis_service',
            'compliance_version': '1.0',
            'pii_filtered': True
        }

    def filter(self, record: LogRecord) -> bool:
        """
        Filter log records, adding correlation ID and applying security measures.

        Args:
            record: LogRecord instance to be filtered

        Returns:
            bool: True if record should be logged
        """
        # Add correlation ID
        record.correlation_id = get_correlation_id()
        
        # Add security context
        for key, value in self.security_context.items():
            setattr(record, key, value)
            
        # Add timestamp in ISO format
        record.timestamp = datetime.now(timezone.utc).isoformat()
        
        # Filter PII from message and exception info
        if hasattr(record, 'msg'):
            record.msg = self._filter_pii(str(record.msg))
        
        if record.exc_info:
            record.exc_text = self._filter_pii(str(record.exc_info))
            
        return True
    
    def _filter_pii(self, text: str) -> str:
        """Filter PII data from text content."""
        for pattern in self.pii_patterns.values():
            text = pattern.sub('[REDACTED]', text)
        return text

def get_correlation_id() -> str:
    """
    Retrieve the current correlation ID from context.

    Returns:
        str: Current correlation ID or empty string if not set
    """
    try:
        return correlation_id.get()
    except Exception as e:
        logger.warning(
            "Failed to retrieve correlation ID",
            extra={'error': str(e)}
        )
        return ''

def set_correlation_id(new_id: str) -> None:
    """
    Set a new correlation ID in the current context.

    Args:
        new_id: Correlation ID to set

    Raises:
        ValueError: If correlation ID format is invalid
    """
    if not new_id or not isinstance(new_id, str):
        raise ValueError("Invalid correlation ID format")
    
    try:
        correlation_id.set(new_id)
        logger.debug(
            "Correlation ID set",
            extra={'correlation_id': new_id}
        )
    except Exception as e:
        logger.error(
            "Failed to set correlation ID",
            extra={'error': str(e), 'correlation_id': new_id}
        )
        raise

def generate_correlation_id() -> str:
    """
    Generate a new secure correlation ID.

    Returns:
        str: New UUID-based correlation ID
    """
    new_id = str(uuid.uuid4())
    logger.debug(
        "Generated new correlation ID",
        extra={'correlation_id': new_id}
    )
    return new_id

def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance with security features.

    Args:
        name: Logger name

    Returns:
        logging.Logger: Configured logger instance
    """
    if not name or not isinstance(name, str):
        raise ValueError("Invalid logger name")
        
    # Create logger instance
    logger_instance = logging.getLogger(name)
    
    # Configure JSON formatter
    formatter = JsonFormatter(
        fmt=LOG_FORMAT['formatters']['json']['format'],
        json_ensure_ascii=False,
        json_indent=None
    )
    
    # Configure handler with security features
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(CorrelationIdFilter())
    
    # Set log level
    logger_instance.setLevel(LOG_LEVEL)
    
    # Add handler if not already present
    if not logger_instance.handlers:
        logger_instance.addHandler(handler)
    
    # Prevent propagation to root logger
    logger_instance.propagate = False
    
    return logger_instance

# Export public interface
__all__ = [
    'get_logger',
    'get_correlation_id',
    'set_correlation_id',
    'generate_correlation_id'
]