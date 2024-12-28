# -----------------------------
# Stage 1: Build environment
# -----------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git && \
    rm -rf /var/cache/apk/*

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with specific flags for production
RUN npm ci --only=production \
    --no-audit \
    --no-optional \
    --no-progress \
    --prefer-offline

# Copy source code and configuration
COPY . .

# Build application with environment variables
ARG VITE_API_BASE_URL
ARG VITE_API_VERSION
ARG VITE_AUTH_DOMAIN
ARG VITE_AUTH_CLIENT_ID
ARG VITE_AUTH_AUDIENCE

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_VERSION=${VITE_API_VERSION}
ENV VITE_AUTH_DOMAIN=${VITE_AUTH_DOMAIN}
ENV VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID}
ENV VITE_AUTH_AUDIENCE=${VITE_AUTH_AUDIENCE}

# Build production bundle
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# -----------------------------
# Stage 2: Production environment
# -----------------------------
FROM nginx:1.25-alpine

# Add labels
LABEL maintainer="DevOps Team" \
      version="1.0.0" \
      description="LinkedIn Profile Search Frontend" \
      environment="production"

# Create nginx user and group with restricted permissions
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.default.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set up security headers
RUN echo 'add_header X-Frame-Options "DENY";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header X-Content-Type-Options "nosniff";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";' >> /etc/nginx/conf.d/default.conf && \
    echo 'add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https:; connect-src '\''self'\'' ${VITE_API_BASE_URL}";' >> /etc/nginx/conf.d/default.conf

# Configure file permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Enable compression and caching
RUN echo 'gzip on;' >> /etc/nginx/conf.d/default.conf && \
    echo 'gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;' >> /etc/nginx/conf.d/default.conf && \
    echo 'gzip_comp_level 6;' >> /etc/nginx/conf.d/default.conf && \
    echo 'gzip_min_length 1000;' >> /etc/nginx/conf.d/default.conf

# Set up health check endpoint
RUN echo 'location /health { return 200 "healthy\n"; }' >> /etc/nginx/conf.d/default.conf

# Configure non-root user
USER nginx

# Expose port
EXPOSE 80

# Set resource limits
ENV NGINX_WORKER_PROCESSES="auto" \
    NGINX_WORKER_CONNECTIONS="1024" \
    NGINX_WORKER_RLIMIT_NOFILE="2048"

# Add security options
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Drop all capabilities except what's needed
RUN apk add --no-cache libcap && \
    setcap cap_net_bind_service=+ep /usr/sbin/nginx && \
    apk del libcap

# Set read-only root filesystem
VOLUME ["/var/cache/nginx", "/var/run"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]