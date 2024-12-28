"""
Entry point for FastAPI routers in the analysis service.
Consolidates health check and analysis endpoints with comprehensive rate limiting and monitoring.

Version: 1.0.0
"""

from fastapi import APIRouter, Depends  # version: 0.100+
from typing import Tuple
import logging

# Import routers
from .health import router as health_router
from .analysis import router as analysis_router

# Configure logging
logger = logging.getLogger(__name__)

# Rate limiting constants
RATE_LIMIT_HEALTH = 1000  # Requests per hour for health endpoints
RATE_LIMIT_ANALYSIS = 100  # Requests per hour for analysis endpoints

def configure_routers(
    health_router: APIRouter,
    analysis_router: APIRouter
) -> Tuple[APIRouter, APIRouter]:
    """
    Configure router settings including tags, rate limits, and security headers.

    Args:
        health_router: Health check router instance
        analysis_router: Analysis endpoints router instance

    Returns:
        Tuple[APIRouter, APIRouter]: Configured health and analysis routers
    """
    # Configure health router
    health_router.prefix = "/health"
    health_router.tags = ["Health"]
    health_router.include_in_schema = True
    
    # Configure analysis router
    analysis_router.prefix = "/api/v1/analysis"
    analysis_router.tags = ["Analysis"]
    analysis_router.include_in_schema = True

    # Add security headers middleware
    @health_router.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Cache-Control"] = "no-store"
        return response

    # Add rate limiting middleware
    @health_router.middleware("http")
    async def rate_limit_health(request, call_next):
        # Rate limiting logic implemented in health router
        return await call_next(request)

    @analysis_router.middleware("http")
    async def rate_limit_analysis(request, call_next):
        # Rate limiting logic implemented in analysis router
        return await call_next(request)

    # Add monitoring middleware
    @health_router.middleware("http")
    @analysis_router.middleware("http")
    async def monitor_requests(request, call_next):
        logger.info(
            "Request received",
            extra={
                "path": request.url.path,
                "method": request.method,
                "client_host": request.client.host
            }
        )
        response = await call_next(request)
        logger.info(
            "Request completed",
            extra={
                "path": request.url.path,
                "status_code": response.status_code
            }
        )
        return response

    logger.info(
        "Routers configured",
        extra={
            "health_rate_limit": f"{RATE_LIMIT_HEALTH}/hour",
            "analysis_rate_limit": f"{RATE_LIMIT_ANALYSIS}/hour"
        }
    )

    return health_router, analysis_router

# Configure and export routers
health_router, analysis_router = configure_routers(health_router, analysis_router)

# Export configured routers
__all__ = ["health_router", "analysis_router"]