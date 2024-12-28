# Provider configurations
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Variables
variable "environment" {
  type        = string
  description = "Environment name (e.g., prod, staging)"
}

variable "datadog_api_key" {
  type        = string
  description = "Datadog API key for authentication"
  sensitive   = true
}

variable "retention_days" {
  type        = number
  description = "Number of days to retain monitoring data"
  default     = 30
}

variable "storage_class" {
  type        = string
  description = "Storage class for persistent volumes"
  default     = "gp3"
}

# Local variables
locals {
  monitoring_namespace = "monitoring"
  monitoring_tags = {
    Environment = var.environment
    Service     = "monitoring"
    ManagedBy   = "terraform"
  }
}

# Create monitoring namespace
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = local.monitoring_namespace
    labels = {
      name        = "monitoring"
      environment = var.environment
    }
  }
}

# Deploy Prometheus Stack (includes Prometheus, Grafana, and AlertManager)
resource "helm_release" "prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "45.7.1"

  values = [
    yamlencode({
      prometheus = {
        retention    = "${var.retention_days}d"
        storageClass = var.storage_class
        resources = {
          requests = {
            cpu    = "1"
            memory = "2Gi"
          }
          limits = {
            cpu    = "2"
            memory = "4Gi"
          }
        }
      }
      alertmanager = {
        enabled = true
        config = {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            group_by      = ["job"]
            group_wait    = "30s"
            group_interval = "5m"
            repeat_interval = "12h"
          }
        }
      }
      grafana = {
        persistence = {
          enabled = true
          size    = "10Gi"
        }
        dashboardProviders = {
          dashboardproviders.yaml = {
            apiVersion = 1
            providers = [{
              name = "default"
              orgId = 1
              folder = ""
              type = "file"
              disableDeletion = false
              editable = true
              options = {
                path = "/var/lib/grafana/dashboards"
              }
            }]
          }
        }
      }
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Deploy Elasticsearch
resource "helm_release" "elasticsearch" {
  name       = "elasticsearch"
  repository = "https://helm.elastic.co"
  chart      = "elasticsearch"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "7.17.3"

  values = [
    yamlencode({
      cluster = {
        name = "monitoring-es"
      }
      persistence = {
        enabled = true
        size    = "100Gi"
      }
      resources = {
        requests = {
          cpu    = "2"
          memory = "4Gi"
        }
      }
      esJavaOpts = "-Xmx2g -Xms2g"
      replicas   = 3
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Deploy Datadog
resource "helm_release" "datadog" {
  name       = "datadog"
  repository = "https://helm.datadoghq.com"
  chart      = "datadog"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "3.30.1"

  values = [
    yamlencode({
      datadog = {
        apiKey = var.datadog_api_key
        apm = {
          enabled = true
          portEnabled = true
        }
        logs = {
          enabled = true
          containerCollectAll = true
        }
        security = {
          runtime = {
            enabled = true
          }
        }
        processAgent = {
          enabled = true
        }
        systemProbe = {
          enabled = true
        }
        tags = local.monitoring_tags
      }
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Outputs
output "monitoring_outputs" {
  value = {
    prometheus_endpoint    = "${helm_release.prometheus_stack.name}-prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    grafana_endpoint      = "${helm_release.prometheus_stack.name}-grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    elasticsearch_endpoint = "${helm_release.elasticsearch.name}-master.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    alertmanager_endpoint = "${helm_release.prometheus_stack.name}-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    datadog_endpoint      = "${helm_release.datadog.name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  }
  description = "Endpoints for monitoring infrastructure components"
}