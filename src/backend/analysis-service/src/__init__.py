"""
Root initialization module for the LinkedIn Profile Analysis Service.
Configures and exposes core analysis functionality with enhanced security,
monitoring, and logging capabilities.

Version: 1.0.0
"""

from fastapi import FastAPI
from prometheus_client import Counter, Histogram  # version: ^0.17.0
import structlog  # version: ^23.1.0
from elastic_apm.contrib.starlette import ElasticAPM  # version: ^6.15.1
import logging
from typing import Optional

from .core.analysis_engine import AnalysisEngine
from .routers.analysis import router as analysis_router
from .utils.logger import get_logger, setup_logging
from .config.claude_config import get_claude_config

# Initialize structured logging
logger = get_logger(__name__)

# Initialize metrics
REQUEST_COUNTER = Counter(
    'analysis_service_requests_total',
    'Total number of analysis requests',
    ['endpoint', 'status']
)
LATENCY_HISTOGRAM = Histogram(
    'analysis_service_latency_seconds',
    'Request latency in seconds',
    ['endpoint']
)

def configure_logging() -> None:
    """Configure structured logging with ELK Stack integration."""
    try:
        setup_logging()
        logger.info("Logging configuration initialized")
    except Exception as e:
        logging.error(f"Failed to configure logging: {str(e)}", exc_info=True)
        raise

def configure_security(app: FastAPI) -> None:
    """Configure security middleware and validation."""
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.trustedhost import TrustedHostMiddleware
    from fastapi.middleware.gzip import GZipMiddleware

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure based on environment
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add security headers
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    logger.info("Security middleware configured")

def configure_monitoring(app: FastAPI) -> None:
    """Configure monitoring and metrics collection."""
    # Initialize APM client
    app.add_middleware(ElasticAPM, service_name="analysis-service")

    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "version": "1.0.0",
            "metrics": {
                "requests": REQUEST_COUNTER._value.get(),
                "average_latency": LATENCY_HISTOGRAM._sum.get() / max(LATENCY_HISTOGRAM._count.get(), 1)
            }
        }

    logger.info("Monitoring configuration initialized")

def initialize_app() -> FastAPI:
    """Initialize and configure the FastAPI application."""
    try:
        # Configure logging first
        configure_logging()

        # Create FastAPI app instance
        app = FastAPI(
            title="LinkedIn Profile Analysis Service",
            description="AI-powered profile analysis and candidate evaluation service",
            version="1.0.0",
            docs_url="/api/docs",
            redoc_url="/api/redoc"
        )

        # Configure security
        configure_security(app)

        # Configure monitoring
        configure_monitoring(app)

        # Initialize Claude AI configuration
        claude_config = get_claude_config()

        # Initialize analysis engine
        analysis_engine = AnalysisEngine(
            claude_client=claude_config.get_client(),
            profile_analyzer=None,  # Will be initialized by DI container
            skill_matcher=None  # Will be initialized by DI container
        )

        # Include routers
        app.include_router(
            analysis_router,
            prefix="/api/v1",
            tags=["analysis"]
        )

        # Configure error handlers
        @app.exception_handler(Exception)
        async def global_exception_handler(request, exc):
            logger.error(
                "Unhandled exception",
                error=str(exc),
                exc_info=True
            )
            return {"detail": "Internal server error"}, 500

        logger.info(
            "Application initialization completed",
            version="1.0.0",
            environment=app.debug
        )

        return app

    except Exception as e:
        logger.error(
            "Failed to initialize application",
            error=str(e),
            exc_info=True
        )
        raise

# Initialize the FastAPI application
app = initialize_app()

# Export public interface
__all__ = ['app', 'AnalysisEngine']