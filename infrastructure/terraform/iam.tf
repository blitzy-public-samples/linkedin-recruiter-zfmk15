# AWS Provider configuration
# Provider version: ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data sources for account and region information
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local variables for resource tagging
locals {
  iam_tags = merge(var.tags, {
    Component     = "iam"
    ManagedBy     = "terraform"
    SecurityZone  = "restricted"
  })
}

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster_role" {
  name        = "${var.eks_config.cluster_name}-cluster-role"
  description = "IAM role for EKS cluster control plane"
  
  force_detach_policies = true
  max_session_duration  = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount": data.aws_caller_identity.current.account_id
        }
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ]

  tags = local.iam_tags
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node_role" {
  name        = "${var.eks_config.cluster_name}-node-role"
  description = "IAM role for EKS worker nodes"
  
  force_detach_policies = true
  max_session_duration  = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount": data.aws_caller_identity.current.account_id
        }
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ]

  tags = local.iam_tags
}

# OIDC Provider for EKS Service Account Integration
resource "aws_iam_openid_connect_provider" "eks" {
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"]
  
  tags = local.iam_tags
}

# Service Account IAM Role
resource "aws_iam_role" "service_account_role" {
  name        = "${var.eks_config.cluster_name}-service-account-role"
  description = "IAM role for Kubernetes service accounts"
  
  force_detach_policies = true
  max_session_duration  = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${aws_iam_openid_connect_provider.eks.url}"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${aws_iam_openid_connect_provider.eks.url}:sub": "system:serviceaccount:kube-system:aws-node"
          "${aws_iam_openid_connect_provider.eks.url}:aud": "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = local.iam_tags
}

# Service Account IAM Policy
resource "aws_iam_role_policy" "service_account_policy" {
  name = "${var.eks_config.cluster_name}-service-account-policy"
  role = aws_iam_role.service_account_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.eks_config.cluster_name}-*",
          "arn:aws:s3:::${var.eks_config.cluster_name}-*/*"
        ]
        Condition = {
          StringEquals = {
            "aws:RequestTag/Environment": var.environment
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.eks_config.cluster_name}-*"
        Condition = {
          StringEquals = {
            "aws:RequestTag/Environment": var.environment
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.eks.arn
      }
    ]
  })
}

# Outputs
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = aws_iam_role.eks_node_role.arn
}

output "service_account_role_arn" {
  description = "ARN of the service account IAM role"
  value       = aws_iam_role.service_account_role.arn
}