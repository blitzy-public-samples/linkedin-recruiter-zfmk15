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

# Local variables for resource tagging and configuration
locals {
  eks_tags = merge(var.tags, {
    Component        = "container-orchestration"
    Environment     = var.environment
    ComplianceLevel = "high"
    ManagedBy       = "terraform"
  })

  # Enhanced logging configuration
  cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

# Data sources for VPC and subnet lookup
data "aws_vpc" "main" {
  id = var.vpc_id
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "private"
  }
}

# KMS key for EKS cluster encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.eks_tags, {
    Name = "${var.eks_config.cluster_name}-encryption-key"
  })
}

# IAM role for EKS cluster
resource "aws_iam_role" "cluster" {
  name = "${var.eks_config.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = local.eks_tags
}

# Attach required policies to cluster role
resource "aws_iam_role_policy_attachment" "cluster_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ])

  policy_arn = each.value
  role       = aws_iam_role.cluster.name
}

# IAM role for node groups
resource "aws_iam_role" "node_groups" {
  name = "${var.eks_config.cluster_name}-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = local.eks_tags
}

# Attach required policies to node group role
resource "aws_iam_role_policy_attachment" "node_group_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])

  policy_arn = each.value
  role       = aws_iam_role.node_groups.name
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = var.eks_config.cluster_name
  version  = var.eks_config.cluster_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = data.aws_subnets.private.ids
    endpoint_private_access = true
    endpoint_public_access  = var.eks_config.cluster_endpoint_public_access
    security_group_ids      = [aws_security_group.cluster.id]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = local.cluster_log_types

  tags = merge(local.eks_tags, {
    Name = var.eks_config.cluster_name
  })

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policies
  ]
}

# Security group for EKS cluster
resource "aws_security_group" "cluster" {
  name        = "${var.eks_config.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = data.aws_vpc.main.id

  tags = merge(local.eks_tags, {
    Name = "${var.eks_config.cluster_name}-cluster-sg"
  })
}

# Node groups
resource "aws_eks_node_group" "main" {
  for_each = var.eks_config.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.node_groups.arn
  subnet_ids      = data.aws_subnets.private.ids

  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }

  instance_types = each.value.instance_types
  capacity_type  = each.value.capacity_type

  update_config {
    max_unavailable = 1
  }

  labels = merge(each.value.labels, {
    "node.kubernetes.io/node-group" = each.key
  })

  tags = merge(local.eks_tags, {
    Name = "${var.eks_config.cluster_name}-${each.key}"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_group_policies
  ]
}

# Cluster add-ons
resource "aws_eks_addon" "addons" {
  for_each = var.eks_config.cluster_addons

  cluster_name = aws_eks_cluster.main.name
  addon_name   = each.key
  version      = each.value.version

  resolve_conflicts_on_update = "OVERWRITE"

  tags = local.eks_tags
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster API endpoint URL"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN for EKS cluster"
  value       = aws_iam_role.cluster.arn
}