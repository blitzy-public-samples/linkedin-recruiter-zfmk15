# Stage 1: Builder
FROM python:3.11-slim AS builder

# Build arguments
ARG POETRY_VERSION=1.6.0
ARG PORT=8000
ARG WORKERS=4

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=${POETRY_VERSION} \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

# Install system dependencies and security updates
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
        curl \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="${POETRY_HOME}/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml poetry.lock ./
COPY requirements.txt ./

# Install dependencies
RUN poetry install --no-dev --no-root

# Copy application source code
COPY src/ ./src/

# Build application
RUN poetry build

# Stage 2: Final runtime image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONPATH=/app/src \
    PORT=8000 \
    WORKERS=4 \
    PYTHONUNBUFFERED=1

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install runtime dependencies
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/dist/*.whl /app/
COPY --from=builder /app/.venv/ /app/.venv/

# Install the wheel package
RUN .venv/bin/pip install *.whl && rm *.whl

# Set secure permissions
RUN chown -R appuser:appuser /app \
    && chmod -R 755 /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE ${PORT}

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Set resource limits
ENV WORKERS_PER_CORE=1 \
    MAX_WORKERS=4 \
    WEB_CONCURRENCY=${WORKERS}

# Set entrypoint
ENTRYPOINT ["/app/.venv/bin/uvicorn"]

# Set default command
CMD ["src.main:app", "--host", "0.0.0.0", "--port", "${PORT}", "--workers", "${WORKERS}"]

# Labels for container metadata
LABEL maintainer="LinkedIn Search Team" \
      version="1.0.0" \
      description="LinkedIn Profile Analysis Service using Claude AI" \
      org.opencontainers.image.source="https://github.com/linkedin-search/analysis-service"