# Environment Identifier
# AWS provider version ~> 5.0
environment = "dev"
region     = "us-west-2"

# VPC Configuration - Single AZ for dev environment
vpc_config = {
  vpc_cidr           = "10.0.0.0/16"
  azs                = ["us-west-2a"]  # Single AZ for dev
  private_subnets    = ["10.0.1.0/24"]
  public_subnets     = ["10.0.2.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true  # Single NAT for cost optimization in dev
}

# EKS Configuration - Minimal cluster for development
eks_config = {
  cluster_version                 = "1.27"
  cluster_name                    = "linkedin-search-dev"
  enable_irsa                     = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true  # Enable public access for dev environment
  
  node_groups = {
    application = {
      instance_types = ["t3.large"]  # Cost-effective instance type for dev
      min_size      = 1
      max_size      = 3
      desired_size  = 1
      disk_size     = 50
    }
  }
}

# RDS Configuration - Single instance, minimal resources
rds_config = {
  instance_class           = "r6g.xlarge"  # Smallest supported instance
  allocated_storage       = 50
  multi_az               = false  # Single AZ for dev
  backup_retention_period = 7     # 7 days retention for dev
  deletion_protection    = false  # Allow deletion in dev
  storage_encrypted      = true   # Maintain encryption even in dev
}

# ElastiCache Configuration - Minimal Redis setup
elasticache_config = {
  node_type                    = "r6g.large"
  num_cache_nodes             = 1
  parameter_group_family      = "redis7"
  engine_version              = "7.0"
  automatic_failover_enabled  = false  # Disabled for dev environment
}

# DocumentDB Configuration - Minimal MongoDB compatible setup
documentdb_config = {
  instance_class             = "r6g.large"
  cluster_size              = 1
  backup_retention_period   = 7
  preferred_backup_window   = "03:00-04:00"
  skip_final_snapshot      = true  # Allow easy cleanup in dev
}

# Monitoring Configuration - Basic monitoring setup
monitoring_config = {
  retention_in_days           = 7    # Shorter retention for dev
  grafana_admin_password     = "Dev-Environment-2024!"  # Dev environment password
  enable_detailed_monitoring = false # Basic monitoring for cost savings
  alarm_email_endpoints      = ["dev-team@example.com"]
}

# Security Configuration - Development appropriate controls
security_config = {
  enable_waf           = true
  allowed_ip_ranges   = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]  # Internal ranges
  ssl_certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/dev-cert"
  enable_cloudtrail   = true
}

# Resource Tags
tags = {
  Environment = "dev"
  Project     = "linkedin-profile-search"
  ManagedBy   = "terraform"
  Team        = "engineering"
  CostCenter  = "dev-infrastructure"
}