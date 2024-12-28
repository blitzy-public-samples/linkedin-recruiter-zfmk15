# Output definitions for monitoring infrastructure module
# Exposes endpoints and configuration details for Prometheus, Grafana, AlertManager and ELK Stack
# Version: 1.0.0

# Prometheus server endpoint output
output "prometheus_endpoint" {
  description = "The endpoint URL for accessing Prometheus metrics server"
  value       = "http://prometheus-server.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  sensitive   = false
}

# Grafana dashboard endpoint output
output "grafana_endpoint" {
  description = "The endpoint URL for accessing Grafana dashboards"
  value       = "http://grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  sensitive   = false
}

# Elasticsearch endpoint output
output "elasticsearch_endpoint" {
  description = "The endpoint URL for accessing Elasticsearch API"
  value       = "http://elasticsearch-master.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9200"
  sensitive   = false
}

# AlertManager endpoint output
output "alertmanager_endpoint" {
  description = "The endpoint URL for accessing AlertManager"
  value       = "http://prometheus-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  sensitive   = false
}

# Monitoring namespace output
output "monitoring_namespace" {
  description = "The Kubernetes namespace where monitoring components are deployed"
  value       = kubernetes_namespace.monitoring.metadata[0].name
  sensitive   = false
}

# Prometheus storage configuration output
output "prometheus_storage_config" {
  description = "Prometheus storage configuration including retention and volume size"
  value = {
    retention_days = var.retention_days
    storage_size   = var.prometheus_storage_size
    persistence_enabled = helm_release.prometheus.status[0] != "" ? true : false
  }
  sensitive = false
}

# Elasticsearch storage configuration output
output "elasticsearch_storage_config" {
  description = "Elasticsearch storage configuration including volume size"
  value = {
    storage_size   = var.elasticsearch_storage_size
    persistence_enabled = helm_release.elasticsearch.status[0] != "" ? true : false
  }
  sensitive = false
}

# Overall monitoring stack status output
output "monitoring_status" {
  description = "Deployment status of the monitoring stack components"
  value = {
    prometheus = {
      status = helm_release.prometheus.status
      version = helm_release.prometheus.version
      namespace = helm_release.prometheus.namespace
    }
    grafana = {
      status = helm_release.grafana.status
      version = helm_release.grafana.version
      namespace = helm_release.grafana.namespace
    }
    elasticsearch = {
      status = helm_release.elasticsearch.status
      version = helm_release.elasticsearch.version
      namespace = helm_release.elasticsearch.namespace
    }
    alerting_enabled = var.enable_alerting
  }
  sensitive = false
}