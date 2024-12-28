# Provider and Terraform Configuration
# AWS Provider version ~> 5.0
# Kubernetes Provider version ~> 2.23
# Helm Provider version ~> 2.11
# Datadog Provider version ~> 3.30
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.30"
    }
  }

  backend "s3" {
    bucket         = "linkedin-search-tfstate"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Provider Configuration
provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

provider "datadog" {
  api_key = data.aws_secretsmanager_secret_version.datadog_api_key.secret_string
  app_key = data.aws_secretsmanager_secret_version.datadog_app_key.secret_string
}

# Local Variables
locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = "linkedin-profile-search"
      ManagedBy   = "terraform"
    }
  )

  environment_config = {
    prod = {
      high_availability = true
      multi_az         = true
      instance_size    = "r6g.xlarge"
      min_nodes       = 3
      max_nodes       = 10
    }
    staging = {
      high_availability = false
      multi_az         = false
      instance_size    = "r6g.large"
      min_nodes       = 2
      max_nodes       = 5
    }
    dev = {
      high_availability = false
      multi_az         = false
      instance_size    = "r6g.medium"
      min_nodes       = 1
      max_nodes       = 3
    }
  }
}

# Data Sources
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_id
}

data "aws_secretsmanager_secret_version" "datadog_api_key" {
  secret_id = "datadog/api-key"
}

data "aws_secretsmanager_secret_version" "datadog_app_key" {
  secret_id = "datadog/app-key"
}

# Core Infrastructure Modules
module "vpc" {
  source = "./vpc"

  vpc_cidr             = var.vpc_config.vpc_cidr
  azs                  = var.vpc_config.azs
  private_subnets      = var.vpc_config.private_subnets
  public_subnets       = var.vpc_config.public_subnets
  enable_nat_gateway   = var.vpc_config.enable_nat_gateway
  single_nat_gateway   = var.vpc_config.single_nat_gateway
  environment          = var.environment
  tags                 = local.common_tags
}

module "security" {
  source = "./security"

  vpc_id              = module.vpc.vpc_id
  environment         = var.environment
  allowed_ip_ranges   = var.security_config.allowed_ip_ranges
  ssl_certificate_arn = var.security_config.ssl_certificate_arn
  enable_waf          = var.security_config.enable_waf
  tags                = local.common_tags
}

module "eks" {
  source = "./eks"

  cluster_name                    = var.eks_config.cluster_name
  cluster_version                 = var.eks_config.cluster_version
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  node_groups                    = var.eks_config.node_groups
  enable_irsa                    = var.eks_config.enable_irsa
  cluster_endpoint_private_access = var.eks_config.cluster_endpoint_private_access
  cluster_endpoint_public_access  = var.eks_config.cluster_endpoint_public_access
  environment                    = var.environment
  tags                          = local.common_tags
}

module "rds" {
  source = "./rds"

  instance_class           = var.rds_config.instance_class
  allocated_storage       = var.rds_config.allocated_storage
  subnet_ids              = module.vpc.private_subnets
  vpc_security_group_ids  = [module.security.security_groups["rds"]]
  multi_az               = local.environment_config[var.environment].multi_az
  backup_retention_period = var.rds_config.backup_retention_period
  deletion_protection    = var.rds_config.deletion_protection
  storage_encrypted      = var.rds_config.storage_encrypted
  environment           = var.environment
  tags                  = local.common_tags
}

module "elasticache" {
  source = "./elasticache"

  node_type                   = var.elasticache_config.node_type
  num_cache_nodes            = var.elasticache_config.num_cache_nodes
  subnet_ids                 = module.vpc.private_subnets
  vpc_security_group_ids     = [module.security.security_groups["elasticache"]]
  parameter_group_family     = var.elasticache_config.parameter_group_family
  engine_version             = var.elasticache_config.engine_version
  automatic_failover_enabled = local.environment_config[var.environment].high_availability
  environment               = var.environment
  tags                      = local.common_tags
}

module "documentdb" {
  source = "./documentdb"

  instance_class           = var.documentdb_config.instance_class
  cluster_size            = var.documentdb_config.cluster_size
  subnet_ids              = module.vpc.private_subnets
  vpc_security_group_ids  = [module.security.security_groups["documentdb"]]
  backup_retention_period = var.documentdb_config.backup_retention_period
  preferred_backup_window = var.documentdb_config.preferred_backup_window
  skip_final_snapshot    = var.documentdb_config.skip_final_snapshot
  environment           = var.environment
  tags                  = local.common_tags
}

module "monitoring" {
  source = "./monitoring"

  cluster_name               = module.eks.cluster_name
  retention_in_days         = var.monitoring_config.retention_in_days
  grafana_admin_password    = var.monitoring_config.grafana_admin_password
  enable_detailed_monitoring = var.monitoring_config.enable_detailed_monitoring
  alarm_email_endpoints     = var.monitoring_config.alarm_email_endpoints
  environment              = var.environment
  tags                     = local.common_tags
}

# Infrastructure Outputs
output "infrastructure_outputs" {
  description = "Critical infrastructure endpoints and configurations"
  value = {
    vpc_id              = module.vpc.vpc_id
    eks_endpoint        = module.eks.cluster_endpoint
    rds_endpoint        = module.rds.endpoint
    monitoring_endpoints = module.monitoring.endpoints
  }
}