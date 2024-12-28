"""
Analysis Service Utilities Package

This package provides secure, compliant logging and distributed tracing capabilities
through correlation ID management. Implements ELK Stack integration for centralized
logging and audit trails while ensuring proper PII protection and security controls.

Version: 1.0.0
"""

# Import core logging utilities with security controls
from .logger import (
    get_logger,
    set_correlation_id,
    get_correlation_id,
    CorrelationIdFilter
)

# Define package version
__version__ = "1.0.0"

# Define public interface with security-vetted exports
__all__ = [
    "get_logger",
    "set_correlation_id", 
    "get_correlation_id",
    "CorrelationIdFilter"
]