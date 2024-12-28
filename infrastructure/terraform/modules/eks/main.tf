# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for common tags and configurations
locals {
  tags = merge(var.tags, {
    Component  = "kubernetes"
    ManagedBy  = "terraform"
    CostCenter = "infrastructure"
  })

  # Default node group configuration for system workloads
  default_node_group = {
    instance_types   = ["t3.large"]
    min_size        = 2
    max_size        = 10
    desired_size    = 2
    disk_size       = 100
    capacity_type   = "ON_DEMAND"
    labels = {
      "node.kubernetes.io/purpose" = "system"
    }
    taints = []
    update_config = {
      max_unavailable_percentage = 33
    }
  }
}

# EKS Cluster IAM Role
resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster-role"

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

  tags = local.tags
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

# EKS Cluster Security Group
resource "aws_security_group" "cluster" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster control plane"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, {
    Name = "${var.cluster_name}-cluster-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Add additional security group rules for cluster
resource "aws_security_group_rule" "cluster_additional" {
  for_each = var.cluster_security_group_additional_rules

  security_group_id = aws_security_group.cluster.id
  type             = each.value.type
  from_port        = each.value.from_port
  to_port          = each.value.to_port
  protocol         = each.value.protocol
  cidr_blocks      = each.value.cidr_blocks
  self             = each.value.self
  description      = each.value.description
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    security_group_ids      = [aws_security_group.cluster.id]
    endpoint_private_access = var.cluster_endpoint_private_access
    endpoint_public_access  = var.cluster_endpoint_public_access
    public_access_cidrs    = var.cluster_endpoint_public_access_cidrs
  }

  encryption_config {
    dynamic "provider" {
      for_each = var.cluster_encryption_config != null ? [var.cluster_encryption_config] : []
      content {
        key_arn = provider.value.provider_key_arn
      }
    }
    resources = var.cluster_encryption_config != null ? var.cluster_encryption_config.resources : ["secrets"]
  }

  enabled_cluster_log_types = var.cluster_log_types

  timeouts {
    create = var.cluster_timeouts.create
    update = var.cluster_timeouts.update
    delete = var.cluster_timeouts.delete
  }

  tags = local.tags

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policies,
    aws_security_group_rule.cluster_additional
  ]
}

# Node Group IAM Role
resource "aws_iam_role" "node" {
  name = "${var.cluster_name}-node-role"

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

  tags = local.tags
}

# Attach required policies to node role
resource "aws_iam_role_policy_attachment" "node_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])

  policy_arn = each.value
  role       = aws_iam_role.node.name
}

# Node Security Group
resource "aws_security_group" "node" {
  name        = "${var.cluster_name}-node-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  tags = merge(local.tags, {
    Name                                        = "${var.cluster_name}-node-sg"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Add additional security group rules for nodes
resource "aws_security_group_rule" "node_additional" {
  for_each = var.node_security_group_additional_rules

  security_group_id = aws_security_group.node.id
  type             = each.value.type
  from_port        = each.value.from_port
  to_port          = each.value.to_port
  protocol         = each.value.protocol
  cidr_blocks      = each.value.cidr_blocks
  self             = each.value.self
  description      = each.value.description
}

# Allow nodes to communicate with cluster
resource "aws_security_group_rule" "cluster_node_communication" {
  security_group_id        = aws_security_group.cluster.id
  source_security_group_id = aws_security_group.node.id
  type                     = "ingress"
  from_port               = 443
  to_port                 = 443
  protocol                = "tcp"
  description             = "Allow nodes to communicate with cluster API Server"
}

# EKS Node Groups
resource "aws_eks_node_group" "main" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  instance_types = each.value.instance_types
  disk_size      = each.value.disk_size
  capacity_type  = each.value.capacity_type

  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }

  update_config {
    max_unavailable_percentage = each.value.update_config.max_unavailable_percentage
  }

  labels = each.value.labels

  dynamic "taint" {
    for_each = each.value.taints
    content {
      key    = taint.value.key
      value  = taint.value.value
      effect = taint.value.effect
    }
  }

  tags = merge(local.tags, {
    Name = "${var.cluster_name}-${each.key}"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_policies
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# Enable IRSA if specified
resource "aws_iam_openid_connect_provider" "main" {
  count = var.enable_irsa ? 1 : 0

  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks[0].certificates[0].sha1_fingerprint]

  tags = local.tags
}

# Get EKS OIDC certificate thumbprint
data "tls_certificate" "eks" {
  count = var.enable_irsa ? 1 : 0

  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}