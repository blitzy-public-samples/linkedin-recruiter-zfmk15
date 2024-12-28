# AWS Provider version ~> 5.0

variable "vpc_id" {
  description = "ID of the VPC where the EKS cluster will be deployed"
  type        = string

  validation {
    condition     = length(var.vpc_id) > 0
    error_message = "VPC ID must be provided"
  }
}

variable "subnet_ids" {
  description = "List of subnet IDs where EKS nodes will be deployed"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnets must be provided for high availability"
  }
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must start with a letter and only contain alphanumeric characters and hyphens"
  }
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.cluster_version))
    error_message = "Cluster version must be 1.27 or higher"
  }
}

variable "node_groups" {
  description = "Map of EKS node group configurations including instance types, scaling settings, and labels"
  type = map(object({
    instance_types   = list(string)
    min_size        = number
    max_size        = number
    desired_size    = number
    disk_size       = number
    capacity_type   = string
    labels          = map(string)
    taints          = list(object({
      key    = string
      value  = string
      effect = string
    }))
    update_config = object({
      max_unavailable_percentage = number
    })
  }))

  validation {
    condition     = length(var.node_groups) > 0
    error_message = "At least one node group must be configured"
  }
}

variable "cluster_endpoint_private_access" {
  description = "Enable private API server endpoint access"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "Enable public API server endpoint access"
  type        = bool
  default     = false
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks that can access the public API server endpoint"
  type        = list(string)
  default     = []

  validation {
    condition     = can([for cidr in var.cluster_endpoint_public_access_cidrs : regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", cidr)])
    error_message = "Invalid CIDR block format in public access CIDR list"
  }
}

variable "tags" {
  description = "Tags to apply to all EKS resources"
  type        = map(string)
  default     = {}
}

variable "cluster_security_group_additional_rules" {
  description = "Additional security group rules to add to the cluster security group"
  type = map(object({
    description = string
    protocol    = string
    from_port   = number
    to_port     = number
    type        = string
    cidr_blocks = list(string)
    self        = bool
  }))
  default = {}
}

variable "node_security_group_additional_rules" {
  description = "Additional security group rules to add to the node security group"
  type = map(object({
    description = string
    protocol    = string
    from_port   = number
    to_port     = number
    type        = string
    cidr_blocks = list(string)
    self        = bool
  }))
  default = {}
}

variable "enable_irsa" {
  description = "Enable IAM roles for service accounts"
  type        = bool
  default     = true
}

variable "cluster_encryption_config" {
  description = "Configuration for cluster encryption"
  type = object({
    provider_key_arn = string
    resources        = list(string)
  })
  default = null
}

variable "cluster_log_types" {
  description = "List of control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_timeouts" {
  description = "Timeouts for cluster operations"
  type = object({
    create = string
    update = string
    delete = string
  })
  default = {
    create = "30m"
    update = "60m"
    delete = "15m"
  }
}