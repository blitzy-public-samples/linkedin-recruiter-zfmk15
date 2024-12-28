# Terraform variable definitions for monitoring infrastructure module
# Configures Prometheus, Grafana, AlertManager and ELK Stack monitoring components
# Version: ~> 1.0

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster where monitoring stack will be deployed"
}

variable "monitoring_namespace" {
  type        = string
  description = "Kubernetes namespace for deploying monitoring components"
  default     = "monitoring"
}

variable "retention_days" {
  type        = number
  description = "Number of days to retain monitoring data"
  default     = 30 # Standard retention period for monitoring data
}

variable "grafana_admin_password" {
  type        = string
  description = "Admin password for Grafana dashboard access"
  sensitive   = true # Marked sensitive to prevent exposure in logs/output
}

variable "enable_alerting" {
  type        = bool
  description = "Flag to enable/disable AlertManager deployment"
  default     = true # Enabled by default for production monitoring
}

variable "elasticsearch_storage_size" {
  type        = string
  description = "Storage size for Elasticsearch data persistence"
  default     = "100Gi" # Default storage allocation for log data
}

variable "prometheus_storage_size" {
  type        = string
  description = "Storage size for Prometheus data persistence"
  default     = "50Gi" # Default storage allocation for metrics data
}