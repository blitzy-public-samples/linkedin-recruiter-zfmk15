"""
Root initialization module for the LinkedIn Profile Search Service.
Configures FastAPI application with comprehensive middleware stack including security,
monitoring, rate limiting, and service dependencies.

Dependencies:
- fastapi==0.100.0
- prometheus-client==0.17.0
- structlog==23.1.0
- fastapi-limiter==0.1.5
- python-json-logger==2.0.7
"""

import os
from typing import Dict, Any
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .routers import search as search_router
from .routers import health as health_router
from .utils.logger import get_logger, set_correlation_id, generate_correlation_id

# Initialize structured logger
logger = get_logger(__name__)

# Initialize metrics collectors
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

class CorrelationMiddleware(BaseHTTPMiddleware):
    """Middleware to add correlation ID to all requests."""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = request.headers.get('X-Correlation-ID') or generate_correlation_id()
        set_correlation_id(correlation_id)
        
        response = await call_next(request)
        response.headers['X-Correlation-ID'] = correlation_id
        return response

class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect request metrics."""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        method = request.method
        path = request.url.path
        
        with REQUEST_LATENCY.labels(method=method, endpoint=path).time():
            response = await call_next(request)
            
        REQUEST_COUNT.labels(
            method=method,
            endpoint=path,
            status=response.status_code
        ).inc()
        
        return response

def create_app() -> FastAPI:
    """
    Factory function to create and configure FastAPI application instance.
    
    Returns:
        FastAPI: Configured application instance with middleware stack
    """
    # Create FastAPI instance with API documentation
    app = FastAPI(
        title="LinkedIn Profile Search Service",
        description="Enterprise-grade LinkedIn profile search and analysis service",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc"
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID"]
    )
    
    # Add security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost").split(",")
    )
    
    # Add monitoring middleware
    app.add_middleware(CorrelationMiddleware)
    app.add_middleware(MetricsMiddleware)
    
    # Add compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Configure error handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Handle request validation errors with detailed responses."""
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                "correlation_id": request.headers.get("X-Correlation-ID"),
                "timestamp": str(datetime.now(timezone.utc))
            }
        )
    
    # Register routers
    app.include_router(
        health_router.router,
        prefix="/api/v1",
        tags=["health"]
    )
    app.include_router(
        search_router.router,
        prefix="/api/v1",
        tags=["search"]
    )
    
    # Startup event handler
    @app.on_event("startup")
    async def startup_event():
        """Initialize service dependencies on startup."""
        logger.info(
            "Search service starting",
            extra={"event": "startup"}
        )
    
    # Shutdown event handler
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup service resources on shutdown."""
        logger.info(
            "Search service shutting down",
            extra={"event": "shutdown"}
        )
    
    return app

# Create application instance
app = create_app()