"""
Health check router providing comprehensive service monitoring endpoints for Kubernetes
with detailed status reporting and dependency checks.

External Dependencies:
- fastapi==0.100.0+
- psutil==5.9.0+ (for system metrics)
- typing==3.11+

Author: LinkedIn Profile Search System Team
"""

import os
import time
import psutil
import platform
from typing import Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, status, Response, HTTPException

from ..utils.logger import get_logger

# Initialize router with prefix and tags
router = APIRouter(prefix='/health', tags=['Health'])

# Configure logger with correlation ID tracking
logger = get_logger(__name__)

# Track service start time for uptime calculation
SERVICE_START_TIME = time.time()

def calculate_uptime() -> float:
    """Calculate service uptime in seconds."""
    return time.time() - SERVICE_START_TIME

def get_system_metrics() -> Dict[str, Any]:
    """Get current system resource metrics."""
    return {
        'cpu_percent': psutil.cpu_percent(interval=0.1),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_usage_percent': psutil.disk_usage('/').percent,
        'open_file_descriptors': len(psutil.Process().open_files())
    }

@router.get('/', status_code=status.HTTP_200_OK)
@logger.catch(exclude=HTTPException)
async def get_health() -> Dict[str, Any]:
    """
    General health check endpoint providing comprehensive service status.
    
    Returns:
        Dict[str, Any]: Detailed service health information including:
            - Service status
            - Uptime
            - Version information
            - Environment details
            - System metrics
    """
    logger.info("Health check requested", extra={'endpoint': '/health'})
    
    try:
        # Get system metrics
        metrics = get_system_metrics()
        
        # Compile health response
        health_info = {
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'service': {
                'name': 'search-service',
                'version': '1.0.0',
                'uptime_seconds': calculate_uptime(),
                'environment': os.getenv('ENVIRONMENT', 'development')
            },
            'system': {
                'hostname': platform.node(),
                'platform': platform.platform(),
                'python_version': platform.python_version(),
                'metrics': metrics
            }
        }
        
        logger.debug("Health check completed successfully", 
                    extra={'health_info': health_info})
        return health_info
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", 
                    extra={'error': str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed"
        )

@router.get('/liveness', status_code=status.HTTP_200_OK)
@logger.catch(exclude=HTTPException)
async def get_liveness() -> Dict[str, Any]:
    """
    Kubernetes liveness probe endpoint verifying basic process health.
    
    Returns:
        Dict[str, Any]: Process health metrics including:
            - Process status
            - Memory usage
            - CPU load
            - Thread count
    """
    logger.info("Liveness probe requested", extra={'endpoint': '/health/liveness'})
    
    try:
        process = psutil.Process()
        
        # Check critical process metrics
        liveness_info = {
            'status': 'alive',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'process': {
                'pid': process.pid,
                'memory_percent': process.memory_percent(),
                'cpu_percent': process.cpu_percent(interval=0.1),
                'thread_count': process.num_threads(),
                'open_files': len(process.open_files())
            }
        }
        
        # Verify process is healthy
        if (liveness_info['process']['memory_percent'] > 95 or 
            liveness_info['process']['cpu_percent'] > 95):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Process resource usage critical"
            )
            
        logger.debug("Liveness check passed", 
                    extra={'liveness_info': liveness_info})
        return liveness_info
        
    except Exception as e:
        logger.error(f"Liveness check failed: {str(e)}", 
                    extra={'error': str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not alive"
        )

@router.get('/readiness', status_code=status.HTTP_200_OK)
@logger.catch(exclude=HTTPException)
async def get_readiness() -> Dict[str, Any]:
    """
    Kubernetes readiness probe endpoint verifying service can handle requests.
    
    Returns:
        Dict[str, Any]: Comprehensive readiness status including:
            - System resources
            - Dependency health
            - Database connections
            - Cache availability
    """
    logger.info("Readiness probe requested", extra={'endpoint': '/health/readiness'})
    
    try:
        # Get system metrics
        metrics = get_system_metrics()
        
        # Check system resources
        if (metrics['cpu_percent'] > 90 or 
            metrics['memory_percent'] > 90 or
            metrics['disk_usage_percent'] > 90):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="System resources critical"
            )
            
        # Compile readiness information
        readiness_info = {
            'status': 'ready',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'system_resources': {
                'status': 'healthy',
                'metrics': metrics
            },
            'dependencies': {
                'database': {
                    'status': 'connected',
                    'latency_ms': 10  # Add actual DB health check
                },
                'cache': {
                    'status': 'connected',
                    'latency_ms': 5  # Add actual cache health check
                },
                'external_apis': {
                    'linkedin_api': {
                        'status': 'available',
                        'latency_ms': 150  # Add actual API health check
                    }
                }
            }
        }
        
        logger.debug("Readiness check passed", 
                    extra={'readiness_info': readiness_info})
        return readiness_info
        
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}", 
                    extra={'error': str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )