# Core Terraform functionality for variable definitions
# terraform ~> 1.0

variable "project" {
  type        = string
  description = "Project name for resource naming and tagging"
}

variable "environment" {
  type        = string
  description = "Environment name (dev/staging/prod) for deployment context"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for secure DocumentDB cluster network placement"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for multi-AZ high availability deployment"
}

variable "instance_class" {
  type        = string
  description = "DocumentDB instance class for cluster nodes"
  default     = "r6g.large"  # Optimal performance for document database workloads
}

variable "cluster_size" {
  type        = number
  description = "Number of instances in the DocumentDB cluster for high availability"
  default     = 3  # Recommended for production high availability across AZs
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for AES-256 encryption of data at rest"
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups for disaster recovery"
  default     = 14  # Two weeks retention for compliance and recovery
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for the DocumentDB cluster and related resources"
  default     = {}
}