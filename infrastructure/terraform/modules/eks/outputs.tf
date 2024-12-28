# Core cluster outputs
output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
  sensitive   = true # Marked sensitive as it's part of cluster access credentials
}

output "cluster_certificate_authority" {
  description = "Base64 encoded certificate authority data for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true # Marked sensitive as it's a security credential
}

output "cluster_version" {
  description = "The Kubernetes version of the EKS cluster"
  value       = aws_eks_cluster.main.version
}

# Security-related outputs
output "cluster_security_group_id" {
  description = "ID of the EKS cluster security group"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "ID of the EKS node security group"
  value       = aws_security_group.node.id
}

output "cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.cluster.arn
}

output "node_role_arn" {
  description = "ARN of the EKS node IAM role"
  value       = aws_iam_role.node.arn
}

# Network configuration outputs
output "cluster_vpc_config" {
  description = "VPC configuration for the EKS cluster"
  value = {
    vpc_id             = var.vpc_id
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.cluster.id]
  }
}

# Node group configuration outputs
output "node_group_config" {
  description = "Configuration of the EKS node groups"
  value = {
    for name, group in aws_eks_node_group.main : name => {
      node_group_name = group.node_group_name
      status         = group.status
      capacity_type  = group.capacity_type
      instance_types = group.instance_types
      scaling_config = group.scaling_config
      labels        = group.labels
    }
  }
}

# Kubeconfig output for cluster access
output "kubeconfig" {
  description = "Structured kubeconfig data for cluster access"
  sensitive   = true # Marked sensitive as it contains cluster access credentials
  value = {
    cluster_name     = aws_eks_cluster.main.name
    endpoint         = aws_eks_cluster.main.endpoint
    ca_data         = aws_eks_cluster.main.certificate_authority[0].data
    cluster_version = aws_eks_cluster.main.version
    region          = data.aws_region.current.name
  }
}

# OIDC provider output for IRSA
output "oidc_provider_arn" {
  description = "ARN of the OIDC provider for IRSA (if enabled)"
  value       = try(aws_iam_openid_connect_provider.main[0].arn, "")
}

# Additional metadata outputs
output "tags" {
  description = "Tags applied to the EKS cluster resources"
  value       = local.tags
}

# Data source for current region
data "aws_region" "current" {}