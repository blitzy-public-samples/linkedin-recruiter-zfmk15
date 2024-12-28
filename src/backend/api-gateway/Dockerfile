# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# -----------------------------
# Stage 2: Production
# -----------------------------
FROM node:18-alpine

# Set labels for container metadata
LABEL maintainer="DevOps Team" \
      application="api-gateway" \
      version="1.0.0" \
      environment="production"

# Set working directory
WORKDIR /app

# Create non-root user and group
RUN addgroup -g 1001 nodegroup && \
    adduser -u 1001 -G nodegroup -s /bin/sh -D nodeuser

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set security configurations
RUN chown -R nodeuser:nodegroup /app && \
    chmod -R 444 /app && \
    chmod -R 555 /app/dist && \
    chmod -R 555 /app/node_modules

# Configure security options
USER nodeuser
ENV NODE_ENV=production
ENV PORT=3000

# Set resource limits
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Configure read-only filesystem and security options
RUN mkdir -p /tmp/nodeuser && \
    chown -R nodeuser:nodegroup /tmp/nodeuser
VOLUME ["/tmp/nodeuser"]

# Expose port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set resource limits
WORKDIR /app
USER nodeuser

# Drop capabilities and set security options
RUN echo "kernel.unprivileged_userns_clone=1" > /etc/sysctl.d/userns.conf

# Start application
CMD ["node", "dist/app.js"]

# Set resource constraints (these are applied at runtime via Docker/K8s)
# CPU: 2
# Memory: 4GB
# PIDs: 50
# File descriptors: 1000