# Stage 1: Build stage
FROM maven:3.9.3-eclipse-temurin-17-alpine AS builder

# Set working directory
WORKDIR /build

# Copy pom.xml for dependency resolution
COPY pom.xml .

# Download project dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build application
RUN mvn clean package -DskipTests

# Extract dependencies
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jdk-alpine

# Add labels
LABEL maintainer="DevOps Team <devops@company.com>" \
      vendor="Company Name" \
      version="1.0.0" \
      description="Data Service for LinkedIn Profile Search System" \
      security.protocol="strict" \
      com.company.component="data-service"

# Create non-root user/group
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Set working directory
WORKDIR /app

# Copy dependencies and application from builder stage
COPY --from=builder /build/target/dependency/BOOT-INF/lib /app/lib
COPY --from=builder /build/target/dependency/META-INF /app/META-INF
COPY --from=builder /build/target/dependency/BOOT-INF/classes /app

# Set correct permissions
RUN chown -R appuser:appgroup /app && \
    chmod -R g-w /app

# Configure security options
RUN mkdir /tmp/spring && \
    chown appuser:appgroup /tmp/spring && \
    chmod 755 /tmp/spring

# Set Java runtime options for containerized environment
ENV JAVA_OPTS="-XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:InitialRAMPercentage=50.0 \
    -Djava.security.egd=file:/dev/./urandom \
    -Dspring.profiles.active=prod \
    -Djava.io.tmpdir=/tmp/spring"

# Expose application port
EXPOSE 8082

# Configure health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8082/actuator/health || exit 1

# Switch to non-root user
USER appuser

# Set security options
SECURITY_OPTS="--security-opt=no-new-privileges:true \
    --cap-drop=ALL \
    --read-only"

# Define entry point
ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS \
    -cp app:app/lib/* \
    com.linkedin.search.DataServiceApplication" ]