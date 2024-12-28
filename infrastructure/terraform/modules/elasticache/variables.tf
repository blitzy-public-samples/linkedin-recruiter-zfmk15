# AWS ElastiCache Redis Cluster Variables
# Provider version: aws ~> 5.0

variable "cluster_id" {
  description = "Unique identifier for the Redis cluster"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Redis cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Redis cluster placement across multiple AZs"
  type        = list(string)
}

variable "node_type" {
  description = "Redis node instance type for the cluster"
  type        = string
  default     = "r6g.large"  # Optimized for memory-intensive caching workloads
}

variable "num_cache_nodes" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 2  # Minimum 2 nodes for high availability
  validation {
    condition     = var.num_cache_nodes >= 2
    error_message = "A minimum of 2 cache nodes is required for high availability."
  }
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"  # Latest stable Redis version
}

variable "maintenance_window" {
  description = "Weekly time range for system maintenance"
  type        = string
  default     = "sun:05:00-sun:06:00"  # Default maintenance window during low-traffic period
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover for cluster reliability"
  type        = bool
  default     = true
}

variable "parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"  # Matches default engine version
}

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest for data security"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit (TLS)"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days."
  }
}

variable "tags" {
  description = "Map of tags to assign to the Redis cluster resources"
  type        = map(string)
  default = {
    Environment = "production"
    Service     = "linkedin-profile-search"
    Terraform   = "true"
  }
}

# Performance tuning variables
variable "maxmemory_policy" {
  description = "Redis maxmemory-policy parameter"
  type        = string
  default     = "volatile-lru"  # Optimized for caching use case
}

variable "snapshot_window" {
  description = "Daily time range for automated snapshot creation"
  type        = string
  default     = "03:00-04:00"  # Default snapshot window during low-traffic period
}

variable "apply_immediately" {
  description = "Specifies whether modifications are applied immediately or during maintenance window"
  type        = bool
  default     = false  # Default to false for production safety
}

variable "notification_topic_arn" {
  description = "ARN of SNS topic for Redis notifications"
  type        = string
  default     = null
}

variable "port" {
  description = "Port number for Redis connections"
  type        = number
  default     = 6379
  validation {
    condition     = var.port > 0 && var.port < 65536
    error_message = "Port number must be between 1 and 65535."
  }
}