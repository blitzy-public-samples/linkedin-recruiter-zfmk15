# Environment Configuration
environment = "prod"
region     = "us-west-2"

# VPC Configuration - Multi-AZ setup for high availability
vpc_config = {
  vpc_cidr           = "10.0.0.0/16"
  azs                = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = false  # Multi-NAT for high availability
}

# EKS Configuration - Production grade Kubernetes cluster
eks_config = {
  cluster_version                 = "1.27"
  cluster_name                    = "linkedin-search-prod"
  enable_irsa                     = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = false  # Private cluster for security
  node_groups = {
    system = {
      instance_types = ["t3.large"]
      min_size      = 2
      max_size      = 4
      desired_size  = 2
    },
    application = {
      instance_types = ["t3.xlarge"]
      min_size      = 3
      max_size      = 10
      desired_size  = 3
    },
    worker = {
      instance_types = ["t3.2xlarge"]
      min_size      = 2
      max_size      = 8
      desired_size  = 2
    }
  }
}

# RDS Configuration - Multi-AZ PostgreSQL
rds_config = {
  instance_class           = "r6g.xlarge"
  allocated_storage       = 500
  multi_az               = true
  backup_retention_period = 30
  deletion_protection    = true
  storage_encrypted      = true
}

# ElastiCache Configuration - Redis cluster with replication
elasticache_config = {
  node_type                   = "r6g.large"
  num_cache_nodes            = 3
  parameter_group_family     = "redis6.x"
  engine_version             = "6.x"
  automatic_failover_enabled = true
}

# DocumentDB Configuration - Production MongoDB cluster
documentdb_config = {
  instance_class           = "r6g.large"
  cluster_size            = 3
  backup_retention_period = 30
  preferred_backup_window = "03:00-05:00"
  skip_final_snapshot     = false
}

# Security Configuration
security_config = {
  enable_waf         = true
  allowed_ip_ranges = ["10.0.0.0/8"]  # Internal network access only
  ssl_certificate_arn = "arn:aws:acm:us-west-2:ACCOUNT_ID:certificate/CERTIFICATE_ID"
  enable_cloudtrail  = true
}

# Monitoring Configuration
monitoring_config = {
  retention_in_days          = 90
  grafana_admin_password    = "REPLACE_WITH_SECURE_PASSWORD"  # Should be injected via secrets management
  enable_detailed_monitoring = true
  alarm_email_endpoints     = ["ops@company.com", "security@company.com"]
}

# Resource Tags
tags = {
  environment  = "production"
  project      = "linkedin-profile-search"
  cost_center  = "recruiting-tech"
  managed_by   = "terraform"
  compliance   = "gdpr,soc2"
  backup_policy = "daily"
  data_classification = "confidential"
}