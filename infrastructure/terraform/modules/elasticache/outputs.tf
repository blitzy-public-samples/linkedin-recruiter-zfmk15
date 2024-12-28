# Redis Cluster Identifier
output "cluster_id" {
  description = "The identifier of the Redis cluster"
  value       = aws_elasticache_replication_group.redis.id
}

# Primary Endpoint Information
output "primary_endpoint" {
  description = "The primary endpoint address for the Redis cluster"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

# Configuration Endpoint
output "configuration_endpoint" {
  description = "The configuration endpoint for the Redis cluster"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
  sensitive   = true
}

# Cache Node Information
output "cache_nodes" {
  description = "List of cache nodes in the Redis cluster with their details"
  value = [
    for node in aws_elasticache_replication_group.redis.member_clusters : {
      id       = node
      address  = node
      port     = var.port
      az       = "Determined by AWS"
    }
  ]
}

# Security Group Information
output "security_group_id" {
  description = "ID of the security group associated with the Redis cluster"
  value       = aws_security_group.redis.id
}

# Redis Port
output "port" {
  description = "Port number used for Redis connections"
  value       = var.port
}

# Comprehensive Cluster Status
output "cluster_status" {
  description = "Comprehensive status information about the Redis cluster"
  value = {
    engine_version    = var.engine_version
    cluster_enabled   = var.multi_az_enabled
    vpc_id           = var.vpc_id
    num_cache_nodes  = var.num_cache_nodes
    node_type        = var.node_type
    encryption = {
      at_rest  = var.at_rest_encryption_enabled
      transit  = var.transit_encryption_enabled
    }
    maintenance = {
      window            = var.maintenance_window
      snapshot_window   = var.snapshot_window
      retention_period  = var.backup_retention_period
    }
    high_availability = {
      multi_az_enabled           = var.multi_az_enabled
      automatic_failover_enabled = var.automatic_failover_enabled
    }
    parameter_group = {
      family = var.parameter_group_family
      name   = aws_elasticache_parameter_group.redis.name
    }
    subnet_group = {
      name    = aws_elasticache_subnet_group.redis.name
      subnets = var.subnet_ids
    }
  }
}

# Authentication Status
output "auth_status" {
  description = "Authentication and encryption status of the Redis cluster"
  value = {
    transit_encryption_enabled = var.transit_encryption_enabled
    at_rest_encryption_enabled = var.at_rest_encryption_enabled
  }
  sensitive = true
}

# Monitoring Configuration
output "monitoring_info" {
  description = "Monitoring and alerting configuration for the Redis cluster"
  value = {
    cpu_alarm_threshold    = "75"
    memory_alarm_threshold = "80"
    notification_topic     = var.notification_topic_arn
    metrics_namespace      = "AWS/ElastiCache"
  }
}