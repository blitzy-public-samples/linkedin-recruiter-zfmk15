"""
Router initialization module for the LinkedIn Profile Search Service.

This module aggregates and exports FastAPI routers for the search service,
providing centralized routing for health checks and LinkedIn profile search
endpoints. It supports the microservices architecture by maintaining clear
boundaries between different service functionalities.

Routers:
    health_router: Health check endpoints for service monitoring
    search_router: LinkedIn profile search and retrieval endpoints

Version: 1.0.0
Author: LinkedIn Profile Search Team
"""

from fastapi import APIRouter  # version ^0.100.0

# Import routers from submodules
from .health import router as health_router
from .search import router as search_router

# Define module metadata
__version__ = "1.0.0"
__author__ = "LinkedIn Profile Search Team"

# Configure health check router
health_router = APIRouter(
    prefix="/health",
    tags=["Health"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

# Configure search router
search_router = APIRouter(
    prefix="/api/v1/search",
    tags=["Search"],
    responses={
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"},
        429: {"description": "Too many requests"},
        500: {"description": "Internal server error"}
    }
)

# Import routes from health router
health_router.get("/")(health_router.get_health)
health_router.get("/liveness")(health_router.get_liveness)
health_router.get("/readiness")(health_router.get_readiness)

# Import routes from search router
search_router.post("/")(search_router.search_profiles)
search_router.get("/{profile_id}")(search_router.get_profile)

# Export routers
__all__ = ["health_router", "search_router"]