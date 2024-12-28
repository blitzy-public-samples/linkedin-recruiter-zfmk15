# -----------------------------
# API Gateway Service Builder
# -----------------------------
FROM node:18-alpine AS api-gateway-builder
LABEL maintainer="DevOps Team <devops@company.com>"
LABEL version="1.0"
LABEL description="API Gateway Service for LinkedIn Profile Search System"

# Security hardening
RUN apk add --no-cache curl=8.4.0-r0 && \
    addgroup -S appgroup && \
    adduser -S node -G appgroup && \
    mkdir -p /app && \
    chown -R node:appgroup /app

WORKDIR /app

# Install dependencies
COPY --chown=node:appgroup package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=node:appgroup ./api-gateway ./

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# -----------------------------
# Analysis Service Builder
# -----------------------------
FROM python:3.11-slim AS analysis-service-builder
LABEL maintainer="DevOps Team <devops@company.com>"
LABEL version="1.0"
LABEL description="Analysis Service for LinkedIn Profile Search System"

# Security hardening
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl=7.88.1-10+deb12u4 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -r -s /bin/false appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Install dependencies
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser ./analysis-service ./

# -----------------------------
# Data Service Builder
# -----------------------------
FROM eclipse-temurin:17-jdk-alpine AS data-service-builder
LABEL maintainer="DevOps Team <devops@company.com>"
LABEL version="1.0"
LABEL description="Data Service for LinkedIn Profile Search System"

# Security hardening
RUN apk add --no-cache curl=8.4.0-r0 && \
    addgroup -S appgroup && \
    adduser -S nobody -G appgroup && \
    mkdir -p /app && \
    chown -R nobody:appgroup /app

WORKDIR /app

# Copy application code and build
COPY --chown=nobody:appgroup ./data-service/pom.xml .
COPY --chown=nobody:appgroup ./data-service/src ./src
RUN ./mvnw clean package -DskipTests && \
    rm -rf ~/.m2

# -----------------------------
# Search Service Builder
# -----------------------------
FROM python:3.11-slim AS search-service-builder
LABEL maintainer="DevOps Team <devops@company.com>"
LABEL version="1.0"
LABEL description="Search Service for LinkedIn Profile Search System"

# Security hardening
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl=7.88.1-10+deb12u4 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -r -s /bin/false appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Install dependencies
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser ./search-service ./

# -----------------------------
# Final API Gateway Image
# -----------------------------
FROM node:18-alpine AS api-gateway
ENV NODE_ENV=production

# Security hardening
RUN apk add --no-cache curl=8.4.0-r0 && \
    addgroup -S appgroup && \
    adduser -S node -G appgroup

WORKDIR /app

# Copy built artifacts
COPY --from=api-gateway-builder --chown=node:appgroup /app ./

# Configure container
USER node
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/health || exit 1

# Resource limits
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Start application
CMD ["npm", "start"]

# -----------------------------
# Final Analysis Service Image
# -----------------------------
FROM python:3.11-slim AS analysis-service
ENV PYTHONUNBUFFERED=1

# Security hardening
RUN useradd -r -s /bin/false appuser

WORKDIR /app

# Copy built artifacts
COPY --from=analysis-service-builder --chown=appuser:appuser /app ./

# Configure container
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# -----------------------------
# Final Data Service Image
# -----------------------------
FROM eclipse-temurin:17-jre-alpine AS data-service

# Security hardening
RUN addgroup -S appgroup && \
    adduser -S nobody -G appgroup

WORKDIR /app

# Copy built artifacts
COPY --from=data-service-builder --chown=nobody:appgroup /app/target/*.jar ./app.jar

# Configure container
USER nobody
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8082/actuator/health || exit 1

# Resource limits
ENV JAVA_OPTS="-Xms512m -Xmx4g -XX:+UseG1GC"

# Start application
CMD ["java", "-jar", "app.jar"]

# -----------------------------
# Final Search Service Image
# -----------------------------
FROM python:3.11-slim AS search-service
ENV PYTHONUNBUFFERED=1

# Security hardening
RUN useradd -r -s /bin/false appuser

WORKDIR /app

# Copy built artifacts
COPY --from=search-service-builder --chown=appuser:appuser /app ./

# Configure container
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Common Labels for all stages
LABEL org.opencontainers.image.vendor="Company Name"
LABEL org.opencontainers.image.url="https://github.com/company/linkedin-profile-search"
LABEL org.opencontainers.image.source="https://github.com/company/linkedin-profile-search"
LABEL org.opencontainers.image.licenses="Proprietary"
LABEL org.opencontainers.image.security.policy="https://github.com/company/linkedin-profile-search/security/policy"
LABEL org.opencontainers.image.base.name="docker.io/library/node:18-alpine"

# Security scanning configuration (requires Trivy in CI/CD pipeline)
# trivy image --severity HIGH,CRITICAL --exit-code 1 <image_name>