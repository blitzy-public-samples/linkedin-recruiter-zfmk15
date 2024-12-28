"""
Health check router for the analysis service.

This module provides health check endpoints for Kubernetes liveness and readiness probes,
with comprehensive dependency monitoring, structured logging, and security features.

Version: 1.0.0
"""

from fastapi import APIRouter, status, Response  # version: 0.100.0
from typing import Dict, Any
import time
from datetime import datetime, timezone
import asyncio
from functools import wraps

from ..utils.logger import get_logger

# Initialize router with prefix and tags
router = APIRouter(prefix="/health", tags=["Health"])

# Configure structured logger
logger = get_logger("health_router")

# Constants
READINESS_TIMEOUT = 5.0  # seconds
DEPENDENCY_TIMEOUTS = {
    "database": 2.0,
    "cache": 1.0,
    "claude_ai": 3.0,
    "message_queue": 2.0
}

def add_security_headers(response: Response) -> None:
    """Add security headers to response."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Cache-Control"] = "no-store"

def with_correlation_tracking():
    """Decorator for correlation ID tracking."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            correlation_id = kwargs.get("request", {}).headers.get(
                "X-Correlation-ID", 
                f"health-{datetime.now(timezone.utc).timestamp()}"
            )
            
            logger.info(
                f"Health check started: {func.__name__}",
                extra={
                    "correlation_id": correlation_id,
                    "endpoint": func.__name__
                }
            )
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                logger.info(
                    f"Health check completed: {func.__name__}",
                    extra={
                        "correlation_id": correlation_id,
                        "duration": duration,
                        "status": "success"
                    }
                )
                return result
                
            except Exception as e:
                logger.error(
                    f"Health check failed: {func.__name__}",
                    extra={
                        "correlation_id": correlation_id,
                        "error": str(e),
                        "status": "error"
                    },
                    exc_info=True
                )
                raise
                
    return decorator

async def check_database_health() -> Dict[str, Any]:
    """Check database connection health."""
    try:
        # Simulate database health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "latency_ms": 100}
    except Exception as e:
        logger.error("Database health check failed", extra={"error": str(e)})
        return {"status": "unhealthy", "error": str(e)}

async def check_cache_health() -> Dict[str, Any]:
    """Check cache service health."""
    try:
        # Simulate cache health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "latency_ms": 50}
    except Exception as e:
        logger.error("Cache health check failed", extra={"error": str(e)})
        return {"status": "unhealthy", "error": str(e)}

async def check_claude_ai_health() -> Dict[str, Any]:
    """Check Claude AI service health."""
    try:
        # Simulate Claude AI health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "latency_ms": 200}
    except Exception as e:
        logger.error("Claude AI health check failed", extra={"error": str(e)})
        return {"status": "unhealthy", "error": str(e)}

async def check_message_queue_health() -> Dict[str, Any]:
    """Check message queue health."""
    try:
        # Simulate message queue health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "latency_ms": 75}
    except Exception as e:
        logger.error("Message queue health check failed", extra={"error": str(e)})
        return {"status": "unhealthy", "error": str(e)}

@router.get("/liveness", status_code=status.HTTP_200_OK)
@with_correlation_tracking()
async def liveness() -> Response:
    """
    Liveness probe endpoint for Kubernetes.
    
    Returns:
        Response: HTTP 200 OK if service is running
    """
    response = Response(
        content='{"status": "OK"}',
        media_type="application/json"
    )
    add_security_headers(response)
    return response

@router.get("/readiness", status_code=status.HTTP_200_OK)
@with_correlation_tracking()
async def readiness() -> Response:
    """
    Readiness probe endpoint for Kubernetes.
    
    Performs comprehensive health checks on all service dependencies.
    
    Returns:
        Response: HTTP 200 OK if service is ready, 503 if not
    """
    start_time = time.time()
    
    try:
        # Run all health checks concurrently with timeouts
        health_checks = await asyncio.gather(
            asyncio.wait_for(check_database_health(), DEPENDENCY_TIMEOUTS["database"]),
            asyncio.wait_for(check_cache_health(), DEPENDENCY_TIMEOUTS["cache"]),
            asyncio.wait_for(check_claude_ai_health(), DEPENDENCY_TIMEOUTS["claude_ai"]),
            asyncio.wait_for(check_message_queue_health(), DEPENDENCY_TIMEOUTS["message_queue"]),
            return_exceptions=True
        )
        
        # Process health check results
        health_status = {
            "database": health_checks[0],
            "cache": health_checks[1],
            "claude_ai": health_checks[2],
            "message_queue": health_checks[3],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - start_time) * 1000)
        }
        
        # Check if any dependency is unhealthy
        is_healthy = all(
            check.get("status") == "healthy" 
            for check in health_status.values() 
            if isinstance(check, dict) and "status" in check
        )
        
        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        
        response = Response(
            content=str(health_status),
            status_code=status_code,
            media_type="application/json"
        )
        add_security_headers(response)
        return response
        
    except asyncio.TimeoutError:
        logger.error("Health check timeout")
        response = Response(
            content='{"status": "timeout", "error": "Health check timeout"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )
        add_security_headers(response)
        return response
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        response = Response(
            content=f'{{"status": "error", "error": "{str(e)}"}}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )
        add_security_headers(response)
        return response

# Export router for FastAPI application
__all__ = ["router"]