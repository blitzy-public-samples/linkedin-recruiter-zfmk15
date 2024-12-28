"""
Configuration module for Claude AI integration with enhanced security and validation.

This module provides secure configuration management for Claude AI integration,
including credential handling, rate limiting, and operational monitoring.

Version: 1.0.0
"""

import os
from datetime import datetime
from typing import Type, ClassVar
from pydantic import (  # version: 2.0+
    BaseModel,
    Field,
    SecretStr,
    HttpUrl,
    PositiveInt,
    validator
)
import validators  # version: 0.20+
from ..utils.logger import get_logger

# Configure module logger
logger = get_logger(__name__)

# Default configuration values
DEFAULT_API_VERSION: str = "v1"
DEFAULT_RATE_LIMIT: int = 500
DEFAULT_TIMEOUT: int = 30
MAX_RATE_LIMIT: int = 1000
MIN_TIMEOUT: int = 5
MAX_TIMEOUT: int = 120
SUPPORTED_MODELS: list[str] = ["claude-2", "claude-instant"]

class ClaudeConfig(BaseModel):
    """
    Enhanced Pydantic model for Claude AI configuration with comprehensive validation.
    
    Implements secure credential handling, rate limiting, and operational monitoring
    with full audit logging capabilities.
    """
    
    # Class-level tracking for configuration instances
    _instances: ClassVar[list["ClaudeConfig"]] = []
    
    # Required configuration fields
    api_key: SecretStr = Field(
        ...,
        env='CLAUDE_API_KEY',
        description="Claude API key (required)",
    )
    api_url: HttpUrl = Field(
        'https://api.anthropic.com',
        env='CLAUDE_API_URL',
        description="Claude API endpoint URL"
    )
    api_version: str = Field(
        DEFAULT_API_VERSION,
        env='CLAUDE_API_VERSION',
        description="API version to use"
    )
    rate_limit: PositiveInt = Field(
        DEFAULT_RATE_LIMIT,
        env='CLAUDE_RATE_LIMIT',
        description="API rate limit per hour"
    )
    timeout: PositiveInt = Field(
        DEFAULT_TIMEOUT,
        env='CLAUDE_TIMEOUT',
        description="API request timeout in seconds"
    )
    max_retries: PositiveInt = Field(
        3,
        env='CLAUDE_MAX_RETRIES',
        description="Maximum number of API request retries"
    )
    model_name: str = Field(
        'claude-2',
        env='CLAUDE_MODEL_NAME',
        description="Claude model version to use"
    )
    last_rotated: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp of last API key rotation"
    )
    audit_enabled: bool = Field(
        True,
        env='CLAUDE_AUDIT_ENABLED',
        description="Enable configuration audit logging"
    )

    class Config:
        """Pydantic model configuration"""
        validate_assignment = True
        extra = "forbid"
        env_file = ".env"
        secrets_dir = "/run/secrets"

    @validator("api_key")
    def validate_api_key(cls, value: SecretStr) -> SecretStr:
        """Validate API key format and security requirements."""
        if not value.get_secret_value():
            raise ValueError("API key cannot be empty")
        
        # Log key rotation audit event
        logger.info(
            "API key validated",
            extra={
                "key_length": len(value.get_secret_value()),
                "last_rotated": datetime.now().isoformat()
            }
        )
        return value

    @validator("rate_limit")
    def validate_rate_limit(cls, value: int) -> int:
        """Validate rate limit against configured thresholds."""
        if value > MAX_RATE_LIMIT:
            raise ValueError(f"Rate limit cannot exceed {MAX_RATE_LIMIT}")
        
        logger.info(
            "Rate limit configured",
            extra={
                "rate_limit": value,
                "max_limit": MAX_RATE_LIMIT
            }
        )
        return value

    @validator("timeout")
    def validate_timeout(cls, value: int) -> int:
        """Validate timeout settings within acceptable range."""
        if not MIN_TIMEOUT <= value <= MAX_TIMEOUT:
            raise ValueError(
                f"Timeout must be between {MIN_TIMEOUT} and {MAX_TIMEOUT} seconds"
            )
        return value

    @validator("model_name")
    def validate_model(cls, value: str) -> str:
        """Validate Claude model name against supported versions."""
        if value not in SUPPORTED_MODELS:
            raise ValueError(
                f"Unsupported model: {value}. Must be one of: {SUPPORTED_MODELS}"
            )
        
        logger.info(
            "Model configuration validated",
            extra={"model": value}
        )
        return value

    def __init__(self, **data):
        """Initialize configuration with validation and audit logging."""
        super().__init__(**data)
        self._register_instance()
        
        if self.audit_enabled:
            logger.info(
                "Claude configuration initialized",
                extra={
                    "api_url": str(self.api_url),
                    "api_version": self.api_version,
                    "rate_limit": self.rate_limit,
                    "model": self.model_name,
                    "timeout": self.timeout
                }
            )

    def _register_instance(self) -> None:
        """Register configuration instance for tracking."""
        self.__class__._instances.append(self)

def get_claude_config() -> ClaudeConfig:
    """
    Retrieve validated Claude AI configuration with security checks.
    
    Returns:
        ClaudeConfig: Validated configuration instance
        
    Raises:
        ValueError: If configuration validation fails
        EnvironmentError: If required environment variables are missing
    """
    try:
        # Create and validate configuration instance
        config = ClaudeConfig()
        
        # Perform additional security checks
        if (datetime.now() - config.last_rotated).days > 90:
            logger.warning(
                "API key rotation recommended",
                extra={"last_rotated": config.last_rotated.isoformat()}
            )
        
        return config

    except Exception as e:
        logger.error(
            "Failed to load Claude configuration",
            extra={"error": str(e)},
            exc_info=True
        )
        raise

# Export public interface
__all__ = ['ClaudeConfig', 'get_claude_config']