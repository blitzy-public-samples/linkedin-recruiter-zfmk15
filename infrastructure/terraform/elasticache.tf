# AWS ElastiCache Redis Configuration
# Provider version: ~> 5.0

# Create ElastiCache subnet group for Redis cluster deployment
resource "aws_elasticache_subnet_group" "cache_subnet_group" {
  name        = "${var.environment}-cache-subnet-group"
  subnet_ids  = var.vpc.private_subnet_ids
  
  tags = merge(var.common_tags, {
    Name = "${var.environment}-cache-subnet-group"
  })
}

# Create custom parameter group for Redis optimization
resource "aws_elasticache_parameter_group" "cache_params" {
  family      = var.elasticache_config.parameter_group_family
  name        = "${var.environment}-cache-params"
  description = "Custom parameter group for LinkedIn Profile Search cache"

  # Performance and reliability optimizations
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Least Recently Used eviction policy
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"  # TCP keepalive interval
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # Samples for LRU eviction
  }

  parameter {
    name  = "activerehashing"
    value = "yes"  # Enable rehashing for better memory management
  }
}

# Create Redis replication group with multi-AZ support
resource "aws_elasticache_replication_group" "cache_cluster" {
  replication_group_id          = "${var.environment}-cache-cluster"
  description                   = "Redis cluster for LinkedIn Profile Search"
  node_type                     = var.elasticache_config.node_type
  num_cache_clusters           = var.elasticache_config.num_cache_nodes
  parameter_group_name         = aws_elasticache_parameter_group.cache_params.name
  port                         = 6379
  subnet_group_name            = aws_elasticache_subnet_group.cache_subnet_group.name
  security_group_ids           = [aws_security_group.cache_sg.id]
  
  # High availability configuration
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  
  # Engine configuration
  engine                      = "redis"
  engine_version              = var.elasticache_config.engine_version
  
  # Security configuration
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  
  # Maintenance and backup configuration
  maintenance_window          = "sun:05:00-sun:09:00"
  snapshot_window            = "00:00-04:00"
  snapshot_retention_limit   = 7
  
  # Auto minor version upgrade for security patches
  auto_minor_version_upgrade = true
  
  tags = merge(var.common_tags, {
    Name = "${var.environment}-cache-cluster"
  })
}

# Security group for Redis cluster
resource "aws_security_group" "cache_sg" {
  name        = "${var.environment}-cache-sg"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc.id

  # Allow inbound Redis traffic from VPC
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc.cidr_block]
    description = "Allow Redis traffic from VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-cache-sg"
  })
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.environment}-cache-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = 300
  statistic          = "Average"
  threshold          = 75
  alarm_actions      = [] # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.cache_cluster.id
  }
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.environment}-cache-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_actions      = [] # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.cache_cluster.id
  }
}

# Output values for other modules
output "elasticache_cluster" {
  value = {
    cluster_id         = aws_elasticache_replication_group.cache_cluster.id
    primary_endpoint   = aws_elasticache_replication_group.cache_cluster.primary_endpoint_address
    reader_endpoint    = aws_elasticache_replication_group.cache_cluster.reader_endpoint_address
    security_group_id  = aws_security_group.cache_sg.id
    parameter_group_id = aws_elasticache_parameter_group.cache_params.id
  }
  description = "ElastiCache cluster configuration details"
}