# LinkedIn Profile Search Data Service

![Build Status](https://github.com/linkedin-search/data-service/workflows/data-service.yml/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-80%25-green)
![Java Version](https://img.shields.io/badge/java-17-blue)
![Database](https://img.shields.io/badge/database-PostgreSQL%2015-blue)
![Security](https://img.shields.io/badge/security-GDPR%20Ready-green)

Enterprise-grade data management service for the LinkedIn Profile Search and Analysis System, providing secure profile storage, data processing, and database operations with high availability and performance optimization.

## Overview

The Data Service is a critical component of the LinkedIn Profile Search and Analysis System, responsible for:
- Secure storage and management of LinkedIn profile data
- High-performance data access and processing
- Database administration and optimization
- Data encryption and security compliance
- Audit logging and monitoring

### Key Features

- Secure profile data storage with encryption at rest
- Advanced data partitioning and indexing
- Comprehensive audit logging
- High availability and fault tolerance
- GDPR compliance and data protection
- Performance optimization and monitoring
- Database backup and recovery

## Technologies

- Java 17 LTS
- Spring Boot 3.1.0
- Spring Data JPA 3.1.0
- PostgreSQL 15+
- Hibernate 6.2+
- HikariCP 5.0.1
- Flyway 9.19.0
- Spring Security 6.1.0

## Prerequisites

- JDK 17 or higher
- Maven 3.8+
- PostgreSQL 15+
- Docker (for containerized deployment)
- Minimum 4GB RAM
- SSL certificates for secure communication

## Configuration

### Environment Variables

```properties
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/linkedin_profiles
SPRING_DATASOURCE_USERNAME=dbuser
SPRING_DATASOURCE_PASSWORD=dbpassword

# Security Configuration
SECURITY_JWT_SECRET=your-jwt-secret
SECURITY_CORS_ALLOWED_ORIGINS=https://example.com
SECURITY_RATE_LIMIT_REQUESTS=100
SECURITY_RATE_LIMIT_REFRESH_PERIOD=60

# Monitoring Configuration
MANAGEMENT_METRICS_EXPORT_PROMETHEUS_ENABLED=true
MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE=health,metrics,prometheus
```

### Application Properties

The service uses a hierarchical configuration system with environment-specific settings:
- `application.yml` - Base configuration
- `application-dev.yml` - Development settings
- `application-prod.yml` - Production settings

## Database Management

### Schema Management

Database migrations are handled through Flyway:

```bash
# Apply migrations
mvn flyway:migrate

# Validate schema
mvn flyway:validate

# Generate schema report
mvn flyway:info
```

### Backup Procedures

```bash
# Create backup
pg_dump -Fc -d linkedin_profiles > backup.dump

# Restore from backup
pg_restore -d linkedin_profiles backup.dump
```

## Security

### Key Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- CORS protection
- XSS prevention
- CSRF protection
- SQL injection prevention
- Audit logging

### SSL Configuration

```bash
# Generate keystore
keytool -genkeypair -alias dataservice -keyalg RSA -keysize 2048 -storetype PKCS12 -keystore dataservice.p12

# Configure SSL in application.yml
server:
  ssl:
    key-store: classpath:dataservice.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
    key-alias: dataservice
```

## Monitoring

### Health Checks

Endpoints for monitoring service health:
- `/actuator/health` - Service health status
- `/actuator/metrics` - Detailed metrics
- `/actuator/prometheus` - Prometheus metrics

### Metrics Collection

The service exports metrics for:
- JVM statistics
- Database connection pool
- Request latencies
- Error rates
- Custom business metrics

## Development

### Build and Run

```bash
# Build the service
mvn clean package

# Run tests
mvn verify

# Run service locally
java -jar target/data-service-1.0.0.jar

# Build Docker image
docker build -t data-service .
```

### Testing

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify -P integration-tests

# Run performance tests
mvn verify -P performance-tests
```

## Troubleshooting

### Common Issues

1. Connection Pool Exhaustion
   - Symptom: `HikariPool-1 - Connection is not available`
   - Solution: Check `max-pool-size` and connection leaks

2. High Memory Usage
   - Symptom: `OutOfMemoryError`
   - Solution: Adjust JVM heap settings and monitor GC

3. Slow Queries
   - Symptom: High latency in response times
   - Solution: Check query plans and index usage

### Performance Optimization

1. Database Indexing
   ```sql
   CREATE INDEX idx_profiles_skills ON profiles USING gin(skills);
   CREATE INDEX idx_profiles_location ON profiles(location);
   ```

2. Query Optimization
   - Use explain analyze for query planning
   - Implement query caching where appropriate
   - Optimize batch operations

## Disaster Recovery

### Backup Strategy

- Full daily backups
- Point-in-time recovery enabled
- Cross-region replication for high availability

### Recovery Procedures

1. Database Failover
   ```bash
   # Initiate failover to standby
   pg_ctl promote -D /path/to/standby
   ```

2. Service Recovery
   ```bash
   # Restore from backup
   pg_restore -d linkedin_profiles latest.backup
   
   # Verify data integrity
   mvn verify -P data-validation
   ```

## License

Copyright (c) 2023 LinkedIn Profile Search System. All rights reserved.