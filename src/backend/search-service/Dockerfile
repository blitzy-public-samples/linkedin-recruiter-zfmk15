# Stage 1: Builder
FROM python:3.11-slim AS builder

# Set build arguments and labels
ARG BUILD_DATE
ARG VCS_REF
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="LinkedIn Profile Search System" \
      org.opencontainers.image.title="Search Service" \
      org.opencontainers.image.security.policy="https://security.example.com"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /build

# Copy requirements file
COPY requirements.txt .

# Install dependencies with security audit
RUN pip install --no-cache-dir pip-audit && \
    pip install --no-cache-dir -r requirements.txt && \
    pip-audit && \
    pip uninstall -y pip-audit

# Create optimized bytecode
RUN python -m compileall /usr/local/lib/python3.11/site-packages

# Stage 2: Final runtime
FROM python:3.11-slim

# Security labels
LABEL seccomp.security.alpha.kubernetes.io/pod="runtime/default" \
      container.apparmor.security.beta.kubernetes.io/pod="runtime/default"

# Create non-root user and group
ENV APP_USER=appuser \
    APP_GROUP=appgroup \
    APP_UID=10001 \
    APP_GID=10001

RUN groupadd -g ${APP_GID} ${APP_GROUP} && \
    useradd -u ${APP_UID} -g ${APP_GROUP} -s /sbin/nologin -M ${APP_USER}

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    LOG_LEVEL=INFO \
    PROMETHEUS_MULTIPROC_DIR=/tmp/prometheus \
    ENVIRONMENT=production

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Create and configure directories
RUN mkdir -p /tmp/prometheus && \
    chown -R ${APP_USER}:${APP_GROUP} /tmp/prometheus && \
    chmod 755 /tmp/prometheus

# Copy application code
COPY --chown=${APP_USER}:${APP_GROUP} . .

# Set permissions
RUN chmod -R 755 /app

# Configure resource limits
RUN echo "* soft nofile 65535" >> /etc/security/limits.conf && \
    echo "* hard nofile 65535" >> /etc/security/limits.conf && \
    echo "* soft nproc 65535" >> /etc/security/limits.conf && \
    echo "* hard nproc 65535" >> /etc/security/limits.conf

# Expose port
EXPOSE 8000

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Switch to non-root user
USER ${APP_USER}:${APP_GROUP}

# Set read-only root filesystem
RUN chmod a-w /etc /usr

# Set entrypoint
ENTRYPOINT ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info", "--proxy-headers", "--forwarded-allow-ips", "*"]