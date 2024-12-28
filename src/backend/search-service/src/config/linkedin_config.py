"""
LinkedIn API configuration module providing secure authentication, rate limiting,
endpoint management and monitoring integration for the search service.

External Dependencies:
- os (built-in)
- typing (built-in)

Author: LinkedIn Profile Search System Team
"""

import os
from typing import Dict, Any, List, Optional
from utils.logger import get_logger

# Initialize logger with correlation tracking
logger = get_logger(__name__)

# Default configuration with comprehensive settings
DEFAULT_CONFIG: Dict[str, Any] = {
    "api_version": "v2",
    "base_url": "https://api.linkedin.com",
    
    # Rate limiting configuration per endpoint
    "rate_limit": {
        "default": {
            "calls": 100,
            "period": 60,  # seconds
            "burst_limit": 150
        },
        "endpoints": {
            "search": {
                "calls": 50,
                "period": 60
            },
            "profile": {
                "calls": 100,
                "period": 60
            }
        },
        "strategy": "token_bucket"  # token_bucket or leaky_bucket
    },
    
    # Request timeout settings
    "timeout": {
        "connect": 5,  # seconds
        "read": 30,    # seconds
        "total": 35    # seconds
    },
    
    # Retry configuration
    "retry": {
        "max_attempts": 3,
        "initial_delay": 1,  # seconds
        "max_delay": 10,     # seconds
        "backoff_factor": 2,
        "retry_on_status_codes": [429, 500, 502, 503, 504]
    },
    
    # Security settings
    "security": {
        "key_rotation_days": 90,
        "request_signing": True,
        "proxy": {
            "enabled": False,
            "url": "",
            "auth": None
        }
    },
    
    # Monitoring configuration
    "monitoring": {
        "metrics_enabled": True,
        "health_check_interval": 60,  # seconds
        "alert_thresholds": {
            "rate_limit_usage": 0.8,  # 80% of limit
            "error_rate": 0.05        # 5% error rate
        }
    },
    
    # API endpoints
    "endpoints": {
        "search": "/v2/search",
        "profile": "/v2/profile",
        "health": "/v2/health"
    }
}

def load_config() -> Dict[str, Any]:
    """
    Load LinkedIn API configuration from environment variables with fallback to defaults.
    Implements secure credential handling and configuration validation.
    
    Returns:
        Dict[str, Any]: Complete configuration dictionary with all LinkedIn API settings
        
    Raises:
        ValueError: If required configuration values are missing or invalid
    """
    try:
        # Start with default configuration
        config = DEFAULT_CONFIG.copy()
        
        # Load required credentials securely
        credentials = {
            "client_id": os.environ.get("LINKEDIN_CLIENT_ID"),
            "client_secret": os.environ.get("LINKEDIN_CLIENT_SECRET"),
            "access_token": os.environ.get("LINKEDIN_ACCESS_TOKEN")
        }
        
        # Validate required credentials
        if not all(credentials.values()):
            raise ValueError("Missing required LinkedIn API credentials")
            
        # Add credentials to config
        config["credentials"] = credentials
        
        # Override defaults with environment variables if provided
        if os.environ.get("LINKEDIN_API_URL"):
            config["base_url"] = os.environ["LINKEDIN_API_URL"]
            
        if os.environ.get("LINKEDIN_RATE_LIMIT_CALLS"):
            config["rate_limit"]["default"]["calls"] = int(os.environ["LINKEDIN_RATE_LIMIT_CALLS"])
            
        if os.environ.get("LINKEDIN_PROXY_ENABLED", "").lower() == "true":
            config["security"]["proxy"]["enabled"] = True
            config["security"]["proxy"]["url"] = os.environ["LINKEDIN_PROXY_URL"]
            
        # Validate complete configuration
        if not validate_config(config):
            raise ValueError("Invalid LinkedIn API configuration")
            
        # Log successful configuration load with masked sensitive data
        masked_config = config.copy()
        masked_config["credentials"] = {k: "****" for k in credentials.keys()}
        logger.info(
            "LinkedIn API configuration loaded successfully",
            extra={
                "config": masked_config,
                "rate_limits": config["rate_limit"]
            }
        )
        
        return config
        
    except Exception as e:
        logger.error(
            "Failed to load LinkedIn API configuration",
            extra={"error": str(e)}
        )
        raise

def validate_config(config: Dict[str, Any]) -> bool:
    """
    Comprehensive validation of LinkedIn API configuration values.
    
    Args:
        config (Dict[str, Any]): Configuration dictionary to validate
        
    Returns:
        bool: True if configuration is valid and secure
        
    Raises:
        ValueError: If configuration validation fails
    """
    try:
        # Validate credentials
        if not all(config.get("credentials", {}).values()):
            raise ValueError("Missing required API credentials")
            
        # Validate rate limits
        rate_limit = config.get("rate_limit", {})
        if not isinstance(rate_limit.get("default", {}).get("calls"), int):
            raise ValueError("Invalid rate limit configuration")
            
        # Validate endpoints
        endpoints = config.get("endpoints", {})
        required_endpoints = {"search", "profile", "health"}
        if not all(endpoint in endpoints for endpoint in required_endpoints):
            raise ValueError("Missing required API endpoints")
            
        # Validate security settings
        security = config.get("security", {})
        if security.get("key_rotation_days", 0) < 30:
            raise ValueError("Key rotation period must be at least 30 days")
            
        # Validate monitoring settings
        monitoring = config.get("monitoring", {})
        if not isinstance(monitoring.get("health_check_interval"), int):
            raise ValueError("Invalid health check interval")
            
        # Validate proxy settings if enabled
        if security.get("proxy", {}).get("enabled"):
            if not security["proxy"].get("url"):
                raise ValueError("Proxy URL required when proxy is enabled")
                
        logger.debug(
            "LinkedIn API configuration validated successfully",
            extra={"validation": "passed"}
        )
        
        return True
        
    except Exception as e:
        logger.error(
            "LinkedIn API configuration validation failed",
            extra={"error": str(e)}
        )
        return False

# Export public interface
__all__ = ["load_config", "DEFAULT_CONFIG"]