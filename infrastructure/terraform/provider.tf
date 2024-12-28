# Provider Configuration for LinkedIn Profile Search and Analysis System
# AWS Provider Version: ~> 5.0
# Kubernetes Provider Version: ~> 2.23
# Helm Provider Version: ~> 2.11

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
  }
}

# AWS Provider Configuration with enhanced security settings
provider "aws" {
  region = var.region

  # Enhanced security settings
  default_tags {
    tags = {
      Environment     = var.environment
      Project        = "linkedin-profile-search"
      ManagedBy      = "terraform"
      SecurityLevel  = "high"
      DataSensitivity = "confidential"
    }
  }

  # Security and compliance configurations
  assume_role {
    role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole"
    session_name = "TerraformDeployment"
    external_id = "LinkedInProfileSearchSystem"
  }
}

# AWS Provider for DR region (US-East-1)
provider "aws" {
  alias  = "dr_region"
  region = "us-east-1"

  # Maintain consistent tags across regions
  default_tags {
    tags = {
      Environment     = var.environment
      Project        = "linkedin-profile-search"
      ManagedBy      = "terraform"
      SecurityLevel  = "high"
      DataSensitivity = "confidential"
      Region         = "dr"
    }
  }

  assume_role {
    role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole"
    session_name = "TerraformDeploymentDR"
    external_id = "LinkedInProfileSearchSystem"
  }
}

# Kubernetes provider configuration for EKS cluster management
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      var.eks_config.cluster_name,
      "--region",
      var.region
    ]
  }
}

# Helm provider configuration for secure application deployment
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        var.eks_config.cluster_name,
        "--region",
        var.region
      ]
    }
  }

  # Helm registry configuration with secure settings
  registry {
    url = "https://charts.helm.sh/stable"
    username = data.aws_secretsmanager_secret_version.helm_registry_credentials.username
    password = data.aws_secretsmanager_secret_version.helm_registry_credentials.password
    
    # Security settings for Helm registry
    tls_config {
      ca_file   = "/etc/ssl/certs/ca-certificates.crt"
      insecure_skip_verify = false
    }
  }
}

# Data sources for provider configuration
data "aws_caller_identity" "current" {}

data "aws_eks_cluster" "cluster" {
  name = var.eks_config.cluster_name
}

data "aws_secretsmanager_secret_version" "helm_registry_credentials" {
  secret_id = "helm-registry-credentials"
}