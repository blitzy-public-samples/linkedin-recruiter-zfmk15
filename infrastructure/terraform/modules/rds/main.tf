# AWS RDS Module Configuration
# Provider version: aws ~> 5.0
# Provider version: random ~> 3.5

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Local variables for resource tagging and configuration
locals {
  db_tags = merge(var.tags, {
    Component = "database"
    Engine    = "postgresql"
  })
}

# IAM policy document for RDS enhanced monitoring
data "aws_iam_policy_document" "monitoring_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["monitoring.rds.amazonaws.com"]
    }
  }
}

# RDS subnet group for multi-AZ deployment
resource "aws_db_subnet_group" "this" {
  name       = var.cluster_identifier
  subnet_ids = var.subnet_ids
  tags       = local.db_tags
}

# Security group for RDS cluster access
resource "aws_security_group" "this" {
  name        = format("%s-sg", var.cluster_identifier)
  description = "Security group for RDS cluster ${var.cluster_identifier}"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
    description     = "PostgreSQL access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.db_tags, {
    Name = format("%s-sg", var.cluster_identifier)
  })
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "monitoring" {
  name               = format("%s-monitoring-role", var.cluster_identifier)
  assume_role_policy = data.aws_iam_policy_document.monitoring_assume_role.json
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  ]
  tags = local.db_tags
}

# Generate secure master password
resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}:?"
}

# RDS Aurora PostgreSQL cluster
resource "aws_rds_cluster" "this" {
  cluster_identifier     = var.cluster_identifier
  engine                = "aurora-postgresql"
  engine_version        = var.engine_version
  database_name         = var.database_name
  master_username       = var.master_username
  master_password       = random_password.master.result
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  
  # Encryption configuration
  storage_encrypted = true
  kms_key_id       = var.kms_key_arn
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "mon:04:00-mon:05:00"
  
  # Snapshot configuration
  skip_final_snapshot       = false
  final_snapshot_identifier = format("%s-final-snapshot-%s", var.cluster_identifier, formatdate("YYYYMMDDHHmmss", timestamp()))
  copy_tags_to_snapshot    = true
  
  # Security features
  deletion_protection = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  iam_database_authentication_enabled = true
  
  # Performance configuration
  serverlessv2_scaling_configuration {
    min_capacity = 2.0
    max_capacity = 16.0
  }
  
  tags = local.db_tags
}

# RDS cluster instances
resource "aws_rds_cluster_instance" "this" {
  count = 2 # Primary + Read replica for high availability

  identifier          = format("%s-%d", var.cluster_identifier, count.index)
  cluster_identifier  = aws_rds_cluster.this.id
  instance_class      = var.instance_class
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
  
  # Performance configuration
  auto_minor_version_upgrade = true
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Monitoring configuration
  monitoring_role_arn = aws_iam_role.monitoring.arn
  monitoring_interval = 60
  
  # Instance configuration
  promotion_tier     = count.index
  copy_tags_to_snapshot = true
  
  tags = merge(local.db_tags, {
    Name = format("%s-instance-%d", var.cluster_identifier, count.index)
  })
}

# Outputs for use by other modules
output "cluster_endpoint" {
  description = "Writer endpoint for the RDS cluster"
  value       = aws_rds_cluster.this.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint for the RDS cluster"
  value       = aws_rds_cluster.this.reader_endpoint
}

output "security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.this.id
}

output "cluster_identifier" {
  description = "Identifier of the RDS cluster"
  value       = aws_rds_cluster.this.cluster_identifier
}