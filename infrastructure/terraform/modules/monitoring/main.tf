# Terraform configuration for deploying monitoring infrastructure
# Version: 1.0.0
# Deploys Prometheus, Grafana, AlertManager and ELK Stack with enhanced security and persistence

terraform {
  required_version = ">= 1.0"
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.9.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20.0"
    }
  }
}

# Create dedicated namespace for monitoring components
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
    labels = {
      name                      = "monitoring"
      environment              = "production"
      "security-context-enabled" = "true"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Deploy Prometheus stack using Helm
resource "helm_release" "prometheus" {
  name       = "prometheus"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus"
  version    = "15.10.0"

  values = [
    file("${path.module}/../../helm/monitoring/values.yaml")
  ]

  set {
    name  = "server.persistentVolume.enabled"
    value = "true"
  }

  set {
    name  = "server.persistentVolume.size"
    value = var.prometheus_storage_size
  }

  set {
    name  = "server.retention"
    value = "${var.retention_days}d"
  }

  set {
    name  = "server.securityContext.runAsNonRoot"
    value = "true"
  }

  set {
    name  = "server.securityContext.fsGroup"
    value = "65534"
  }

  set {
    name  = "alertmanager.enabled"
    value = var.enable_alerting
  }
}

# Deploy Grafana dashboard using Helm
resource "helm_release" "grafana" {
  name       = "grafana"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  version    = "6.50.0"

  values = [
    file("${path.module}/../../helm/monitoring/values.yaml")
  ]

  set {
    name  = "persistence.enabled"
    value = "true"
  }

  set {
    name  = "persistence.size"
    value = "10Gi"
  }

  set {
    name  = "adminPassword"
    value = var.grafana_admin_password
  }

  set {
    name  = "securityContext.runAsNonRoot"
    value = "true"
  }

  set {
    name  = "securityContext.fsGroup"
    value = "472"
  }

  depends_on = [helm_release.prometheus]
}

# Deploy Elasticsearch for log aggregation
resource "helm_release" "elasticsearch" {
  name       = "elasticsearch"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://helm.elastic.co"
  chart      = "elasticsearch"
  version    = "7.17.3"

  values = [
    file("${path.module}/../../helm/monitoring/values.yaml")
  ]

  set {
    name  = "persistence.enabled"
    value = "true"
  }

  set {
    name  = "volumeClaimTemplate.resources.requests.storage"
    value = var.elasticsearch_storage_size
  }

  set {
    name  = "securityContext.runAsNonRoot"
    value = "true"
  }

  set {
    name  = "securityContext.fsGroup"
    value = "1000"
  }
}

# Output endpoints for service discovery
output "prometheus_endpoint" {
  description = "Prometheus server endpoint URL"
  value       = "http://prometheus-server.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
}

output "grafana_endpoint" {
  description = "Grafana dashboard endpoint URL"
  value       = "http://grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
}

output "elasticsearch_endpoint" {
  description = "Elasticsearch endpoint URL"
  value       = "http://elasticsearch-master.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9200"
}