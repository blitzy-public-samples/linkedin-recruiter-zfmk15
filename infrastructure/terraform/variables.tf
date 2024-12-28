# AWS Provider Configuration Variables
# AWS provider version ~> 5.0
variable "environment" {
  description = "Deployment environment name"
  type        = string
  
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment must be one of: prod, staging, dev"
  }
}

variable "region" {
  description = "AWS region for resource deployment"
  type        = string
  
  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central)-[1-3]$", var.region))
    error_message = "Must be a valid AWS region identifier"
  }
}

# VPC Configuration
variable "vpc_config" {
  description = "VPC network configuration settings"
  type = object({
    vpc_cidr             = string
    azs                  = list(string)
    private_subnets      = list(string)
    public_subnets       = list(string)
    enable_nat_gateway   = bool
    single_nat_gateway   = bool
  })
  
  validation {
    condition     = can(cidrhost(var.vpc_config.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# EKS Configuration
variable "eks_config" {
  description = "EKS cluster configuration settings"
  type = object({
    cluster_version                  = string
    cluster_name                     = string
    node_groups                      = map(any)
    enable_irsa                      = bool
    cluster_endpoint_private_access  = bool
    cluster_endpoint_public_access   = bool
  })
  
  validation {
    condition     = can(regex("^1\\.(2[4-7]|[3-9][0-9])\\.", var.eks_config.cluster_version))
    error_message = "EKS cluster version must be 1.24 or higher"
  }
}

# RDS Configuration
variable "rds_config" {
  description = "RDS PostgreSQL configuration settings"
  type = object({
    instance_class           = string
    allocated_storage       = number
    multi_az               = bool
    backup_retention_period = number
    deletion_protection    = bool
    storage_encrypted      = bool
  })
  
  validation {
    condition     = contains(["r6g.xlarge", "r6g.2xlarge", "r6g.4xlarge"], var.rds_config.instance_class)
    error_message = "RDS instance class must be one of the supported r6g types"
  }
}

# ElastiCache Configuration
variable "elasticache_config" {
  description = "Redis ElastiCache configuration settings"
  type = object({
    node_type                    = string
    num_cache_nodes             = number
    parameter_group_family      = string
    engine_version              = string
    automatic_failover_enabled  = bool
  })
  
  validation {
    condition     = can(regex("^r6g\\.", var.elasticache_config.node_type))
    error_message = "ElastiCache node type must be r6g family"
  }
}

# DocumentDB Configuration
variable "documentdb_config" {
  description = "DocumentDB configuration settings"
  type = object({
    instance_class             = string
    cluster_size              = number
    backup_retention_period   = number
    preferred_backup_window   = string
    skip_final_snapshot      = bool
  })
  
  validation {
    condition     = var.documentdb_config.backup_retention_period >= 1 && var.documentdb_config.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days"
  }
}

# Monitoring Configuration
variable "monitoring_config" {
  description = "Monitoring and alerting configuration settings"
  type = object({
    retention_in_days           = number
    grafana_admin_password     = string
    enable_detailed_monitoring = bool
    alarm_email_endpoints      = list(string)
  })
  
  validation {
    condition     = length(var.monitoring_config.grafana_admin_password) >= 12
    error_message = "Grafana admin password must be at least 12 characters long"
  }
}

# Security Configuration
variable "security_config" {
  description = "Security and compliance configuration settings"
  type = object({
    enable_waf           = bool
    allowed_ip_ranges   = list(string)
    ssl_certificate_arn = string
    enable_cloudtrail   = bool
  })
  
  validation {
    condition     = can(regex("^arn:aws:acm:", var.security_config.ssl_certificate_arn))
    error_message = "SSL certificate ARN must be a valid ACM certificate ARN"
  }
}

# Resource Tagging
variable "tags" {
  description = "Resource tags for cost allocation and organization"
  type        = map(string)
  default     = {}
  
  validation {
    condition     = length(var.tags) <= 50
    error_message = "Maximum of 50 tags allowed per resource"
  }
}

# Default values are not provided here as they should be defined in environment-specific tfvars files