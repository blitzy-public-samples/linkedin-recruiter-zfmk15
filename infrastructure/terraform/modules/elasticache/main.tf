# AWS ElastiCache Redis Cluster Configuration
# Provider version: aws ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Redis subnet group for multi-AZ deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.cluster_id}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Redis cluster ${var.cluster_id}"
  tags        = var.tags
}

# Redis parameter group for performance optimization
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.parameter_group_family
  name        = "${var.cluster_id}-params"
  description = "Custom parameter group for Redis cluster ${var.cluster_id}"

  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  tags = var.tags
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "${var.cluster_id}-sg"
  description = "Security group for Redis cluster ${var.cluster_id}"
  vpc_id      = var.vpc_id
  tags        = var.tags

  ingress {
    description = "Redis traffic from internal network"
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Redis replication group for high availability
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = var.cluster_id
  replication_group_description = "Redis cluster for LinkedIn Profile Search system"
  node_type                    = var.node_type
  port                         = var.port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]
  
  # High availability configuration
  automatic_failover_enabled    = var.automatic_failover_enabled
  multi_az_enabled             = var.multi_az_enabled
  num_cache_clusters           = var.num_cache_nodes
  
  # Engine configuration
  engine                       = "redis"
  engine_version              = var.engine_version
  
  # Maintenance and backup configuration
  maintenance_window           = var.maintenance_window
  snapshot_window             = var.snapshot_window
  snapshot_retention_limit     = var.backup_retention_period
  auto_minor_version_upgrade  = true
  apply_immediately           = var.apply_immediately
  
  # Security configuration
  at_rest_encryption_enabled  = var.at_rest_encryption_enabled
  transit_encryption_enabled  = var.transit_encryption_enabled
  
  # Notification configuration
  notification_topic_arn      = var.notification_topic_arn

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.cluster_id}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  namespace           = "AWS/ElastiCache"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = "300"
  evaluation_periods  = "2"
  threshold           = "75"
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [var.notification_topic_arn]
  ok_actions          = [var.notification_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.cluster_id}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  namespace           = "AWS/ElastiCache"
  metric_name         = "DatabaseMemoryUsagePercentage"
  statistic           = "Average"
  period              = "300"
  evaluation_periods  = "2"
  threshold           = "80"
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [var.notification_topic_arn]
  ok_actions          = [var.notification_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}