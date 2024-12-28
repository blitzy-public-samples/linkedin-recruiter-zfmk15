# Basic Environment Configuration
environment = "staging"
region = "us-west-2"

# VPC Configuration - Single AZ for staging
vpc_config = {
  vpc_cidr = "10.1.0.0/16"  # Staging VPC CIDR block
  azs = ["us-west-2a"]      # Single AZ for staging
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24"]
  public_subnets  = ["10.1.11.0/24", "10.1.12.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true  # Single NAT for cost optimization in staging
}

# EKS Configuration - Fixed capacity for staging
eks_config = {
  cluster_version = "1.27"
  cluster_name = "linkedin-search-staging"
  enable_irsa = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access = true
  node_groups = {
    application = {
      min_size = 2
      max_size = 4
      desired_size = 2
      instance_types = ["t3.large"]
      capacity_type = "ON_DEMAND"
    }
  }
}

# RDS Configuration - Single AZ for staging
rds_config = {
  instance_class = "r6g.xlarge"
  allocated_storage = 100
  multi_az = false  # Single AZ for staging
  backup_retention_period = 7
  deletion_protection = true
  storage_encrypted = true
}

# ElastiCache Configuration - Minimal setup for staging
elasticache_config = {
  node_type = "r6g.large"
  num_cache_nodes = 1
  parameter_group_family = "redis7"
  engine_version = "7.0"
  automatic_failover_enabled = false  # Disabled for staging
}

# DocumentDB Configuration - Minimal cluster for staging
documentdb_config = {
  instance_class = "r6g.large"
  cluster_size = 1
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  skip_final_snapshot = false
}

# Monitoring Configuration - Debug logging enabled
monitoring_config = {
  retention_in_days = 30
  grafana_admin_password = "StageGrafana2024!"  # Should be replaced with SecureString parameter
  enable_detailed_monitoring = true
  alarm_email_endpoints = ["staging-alerts@example.com"]
}

# Security Configuration
security_config = {
  enable_waf = true
  allowed_ip_ranges = ["10.0.0.0/8"]  # Internal network access
  ssl_certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/staging-cert"
  enable_cloudtrail = true
}

# Resource Tags
tags = {
  environment = "staging"
  project = "linkedin-profile-search"
  managed_by = "terraform"
  cost_center = "engineering"
  backup_policy = "daily"
}