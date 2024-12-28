# AWS Provider version: ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Environment Information
output "environment" {
  description = "Current deployment environment information"
  value = {
    name = var.environment
    tags = merge(var.tags, {
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = "linkedin-profile-search"
      LastUpdated = timestamp()
    })
  }
  sensitive = false
}

# VPC Infrastructure Outputs
output "vpc_outputs" {
  description = "VPC infrastructure configuration and networking details"
  value = {
    vpc_id          = data.aws_vpc.main.id
    vpc_cidr        = data.aws_vpc.main.cidr_block
    private_subnets = data.aws_subnets.private.ids
    public_subnets  = aws_subnet.public[*].id
    nat_gateway_ips = aws_eip.nat[*].public_ip
    flow_logs_group = var.vpc_config.enable_flow_logs ? aws_cloudwatch_log_group.flow_logs[0].name : null
  }
  sensitive = false
}

# EKS Cluster Outputs
output "eks_outputs" {
  description = "EKS cluster access and configuration details"
  value = {
    cluster_name                = aws_eks_cluster.main.name
    cluster_version            = aws_eks_cluster.main.version
    cluster_endpoint           = aws_eks_cluster.main.endpoint
    cluster_security_group_ids = [aws_security_group.cluster.id]
    node_security_group_ids    = [aws_security_group.cluster.id]
    oidc_provider_url         = aws_eks_cluster.main.identity[0].oidc[0].issuer
    cluster_certificate_authority_data = aws_eks_cluster.main.certificate_authority[0].data
  }
  sensitive = true
}

# Database Infrastructure Outputs
output "database_outputs" {
  description = "Database endpoints and connection information"
  value = {
    # RDS PostgreSQL
    postgresql = {
      writer_endpoint = aws_rds_cluster.main.endpoint
      reader_endpoint = aws_rds_cluster.main.reader_endpoint
      port           = 5432
      database_name  = "linkedin_search"
      secret_arn     = aws_secretsmanager_secret.rds_password.arn
    }
    # DocumentDB
    mongodb = {
      cluster_endpoint = aws_docdb_cluster.docdb.endpoint
      reader_endpoint  = aws_docdb_cluster.docdb.reader_endpoint
      port            = 27017
      secret_arn      = aws_secretsmanager_secret.docdb_credentials.arn
    }
    # ElastiCache Redis
    redis = {
      primary_endpoint = aws_elasticache_replication_group.cache_cluster.primary_endpoint_address
      reader_endpoint  = aws_elasticache_replication_group.cache_cluster.reader_endpoint_address
      port            = 6379
    }
  }
  sensitive = true
}

# Monitoring Infrastructure Outputs
output "monitoring_outputs" {
  description = "Monitoring and observability endpoints"
  value = {
    prometheus = {
      endpoint = "${helm_release.prometheus_stack.name}-prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
      port     = 9090
    }
    grafana = {
      endpoint = "${helm_release.prometheus_stack.name}-grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
      port     = 3000
    }
    alertmanager = {
      endpoint = "${helm_release.prometheus_stack.name}-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
      port     = 9093
    }
    elasticsearch = {
      endpoint = "${helm_release.elasticsearch.name}-master.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
      port     = 9200
    }
    datadog = {
      endpoint = "${helm_release.datadog.name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
      apm_port = 8126
    }
  }
  sensitive = false
}

# Security Outputs
output "security_outputs" {
  description = "Security-related infrastructure information"
  value = {
    vpc_flow_logs_enabled = var.vpc_config.enable_flow_logs
    encryption_keys = {
      rds_key_arn        = aws_kms_key.rds.arn
      eks_key_arn        = aws_kms_key.eks.arn
      documentdb_key_arn = data.aws_kms_key.kms_key_arn.arn
    }
    security_groups = {
      rds_sg_id        = aws_security_group.rds.id
      eks_cluster_sg_id = aws_security_group.cluster.id
      cache_sg_id      = aws_security_group.cache_sg.id
      docdb_sg_id      = var.vpc_config.security_group_ids[0]
    }
  }
  sensitive = true
}

# Service Discovery Outputs
output "service_discovery_outputs" {
  description = "Service discovery and DNS information"
  value = {
    environment_domain = "${var.environment}.linkedin-search.internal"
    service_endpoints = {
      api_gateway = "api.${var.environment}.linkedin-search.internal"
      web_app     = "app.${var.environment}.linkedin-search.internal"
      monitoring  = "monitoring.${var.environment}.linkedin-search.internal"
    }
  }
  sensitive = false
}