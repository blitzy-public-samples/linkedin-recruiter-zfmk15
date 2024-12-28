# LinkedIn Profile Analysis Service

Enterprise-grade service for AI-powered candidate evaluation and scoring using Claude AI technology. This service provides sophisticated profile analysis capabilities within the LinkedIn Profile Search and Analysis System.

## Features

- 🧠 Advanced Claude AI-powered profile analysis with configurable evaluation criteria
- 🎯 Real-time skill matching and gap analysis with confidence scoring
- 📊 Comprehensive experience evaluation using AI-driven assessment
- 🏆 Sophisticated candidate scoring and ranking algorithms
- ⚡ High-performance asynchronous processing support
- 🔒 Production-grade REST API endpoints with authentication
- 📈 Comprehensive Prometheus metrics integration for monitoring
- 📝 Structured logging with correlation IDs and trace context

## Prerequisites

- Python 3.11+ with virtual environment setup
- Poetry 1.4+ for dependency management
- Docker 24+ for containerization
- Claude AI API credentials with appropriate access levels
- Redis 7.0+ instance for distributed caching
- Kubernetes 1.27+ cluster for production deployment
- Prometheus and Grafana for monitoring

## Quick Start

1. Clone the repository and navigate to the service directory:
```bash
cd src/backend/analysis-service
```

2. Install dependencies using Poetry:
```bash
poetry install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the service locally:
```bash
poetry run uvicorn src.main:app --reload
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_API_KEY` | Claude AI API authentication key | Required |
| `CLAUDE_MODEL_VERSION` | Claude model version to use | `claude-2` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `LOG_LEVEL` | Application log level | `INFO` |
| `API_RATE_LIMIT` | Requests per minute per client | `100` |
| `CACHE_TTL` | Cache entry lifetime in seconds | `3600` |
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` |

### Security Configuration

- TLS/SSL encryption enabled by default
- JWT authentication required for all endpoints
- Rate limiting per client IP and API key
- Sensitive data encryption at rest
- Regular security scanning and updates

## API Documentation

### Profile Analysis Endpoint

```http
POST /api/v1/analyze
Content-Type: application/json
Authorization: Bearer <token>

{
    "profile_id": "uuid",
    "criteria": {
        "required_skills": ["python", "aws"],
        "experience_level": "senior",
        "role_type": "software_engineer"
    }
}
```

Response:
```json
{
    "analysis_id": "uuid",
    "match_score": 92.5,
    "confidence": 0.95,
    "skill_matches": [...],
    "experience_evaluation": {...},
    "recommendations": [...]
}
```

For complete API documentation, visit `/docs` when running the service.

## Resource Requirements

### Compute Resources
- CPU: 4 cores minimum, 8 cores recommended
- Memory: 8GB RAM minimum, 16GB recommended
- Storage: 20GB minimum, scalable based on profile volume

### Network
- Port 8000: FastAPI application endpoint
- Port 9090: Prometheus metrics endpoint

## Dependencies

### Runtime Dependencies
- fastapi ^0.100.0 - High-performance REST API framework
- anthropic ^0.3.0 - Official Claude AI SDK for profile analysis
- numpy ^1.24.0 - Numerical computations for scoring algorithms
- pandas ^2.0.0 - Efficient data processing and analysis
- prometheus-client ^0.17.0 - Metrics collection and exposure
- redis ^4.6.0 - Distributed caching and rate limiting

### Development Dependencies
- pytest ^7.4.0 - Comprehensive testing framework
- black ^23.7.0 - Code formatting and style enforcement
- mypy ^1.4.0 - Static type checking for Python
- pytest-cov ^4.1.0 - Test coverage reporting
- pre-commit ^3.3.3 - Git hooks for code quality

## Deployment

### Docker Build
```bash
docker build -t linkedin-analysis-service:latest .
```

### Kubernetes Deployment
```bash
kubectl apply -f k8s/
```

### Health Checks
- Readiness probe: `/health/ready`
- Liveness probe: `/health/live`
- Startup probe: `/health/startup`

### Monitoring
- Prometheus metrics: `/metrics`
- Grafana dashboards available in `monitoring/dashboards/`
- Default alerts configured in `monitoring/alerts/`

## Development

### Testing
```bash
# Run unit tests
poetry run pytest

# Run with coverage
poetry run pytest --cov

# Type checking
poetry run mypy src/
```

### Code Quality
```bash
# Format code
poetry run black src/

# Run pre-commit hooks
poetry run pre-commit run --all-files
```

## Production Considerations

### Scaling
- Horizontal scaling via Kubernetes HPA
- Redis cluster for distributed caching
- Load balancing across multiple instances

### Security
- Regular security updates and patches
- Automated vulnerability scanning
- Access control and audit logging
- Data encryption in transit and at rest

### Monitoring
- Real-time performance metrics
- Error rate tracking and alerting
- Resource utilization monitoring
- API usage and latency tracking

## Support

For issues and feature requests, please contact:
- Technical Support: tech-support@example.com
- Security Issues: security@example.com

## License

Copyright (c) 2023. All rights reserved.