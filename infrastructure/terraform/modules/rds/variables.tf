# Core Terraform functionality for variable definitions
# terraform ~> 1.0

# Cluster identification
variable "cluster_identifier" {
  type        = string
  description = "Unique identifier for the RDS cluster"
}

# Networking configuration
variable "vpc_id" {
  type        = string
  description = "VPC ID where RDS cluster will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for multi-AZ deployment"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block for security group rules"
}

# Database engine configuration
variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version for RDS cluster"
  default     = "15.4" # Latest stable PostgreSQL version
}

variable "instance_class" {
  type        = string
  description = "Instance type for RDS cluster nodes"
  default     = "r6g.xlarge" # Matches technical spec for production use
}

# Database settings
variable "database_name" {
  type        = string
  description = "Name of the initial database to be created"
}

variable "master_username" {
  type        = string
  description = "Master username for database access"
  default     = "postgres" # Default PostgreSQL admin username
}

# Backup configuration
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 30 # Standard retention for production databases
}

# Security configuration
variable "kms_key_arn" {
  type        = string
  description = "ARN of KMS key for database encryption"
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Resource tags for RDS cluster and related resources"
  default = {
    Environment = "production"
    Managed_by  = "terraform"
  }
}