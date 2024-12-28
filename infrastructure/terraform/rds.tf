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

# Local variables for resource tagging
locals {
  rds_tags = merge(var.tags, {
    Component   = "database"
    Service     = "postgresql"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = merge(local.rds_tags, {
    Name = "linkedin-search-rds-key-${var.environment}"
  })
}

# RDS subnet group
resource "aws_db_subnet_group" "main" {
  name        = "linkedin-search-${var.environment}"
  description = "RDS subnet group for LinkedIn Search PostgreSQL"
  subnet_ids  = var.private_subnets

  tags = merge(local.rds_tags, {
    Name = "linkedin-search-subnet-group-${var.environment}"
  })
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "linkedin-search-rds-${var.environment}"
  description = "Security group for LinkedIn Search RDS cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL access from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_config.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.rds_tags, {
    Name = "linkedin-search-rds-sg-${var.environment}"
  })
}

# RDS Aurora PostgreSQL cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier     = "linkedin-search-${var.environment}"
  engine                = "aurora-postgresql"
  engine_version        = "15.3"
  database_name         = "linkedin_search"
  master_username       = "admin"
  master_password       = random_password.rds_password.result
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  storage_encrypted        = var.rds_config.storage_encrypted
  kms_key_id              = aws_kms_key.rds.arn
  backup_retention_period = var.rds_config.backup_retention_period
  preferred_backup_window = "03:00-04:00"
  
  skip_final_snapshot     = var.environment != "prod"
  deletion_protection     = var.rds_config.deletion_protection
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  apply_immediately = var.environment != "prod"
  
  tags = merge(local.rds_tags, {
    Name = "linkedin-search-cluster-${var.environment}"
  })
}

# Generate random password for RDS
resource "random_password" "rds_password" {
  length  = 16
  special = true
}

# Store RDS password in Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name = "linkedin-search/rds/${var.environment}/master-password"
  
  tags = merge(local.rds_tags, {
    Name = "linkedin-search-rds-password-${var.environment}"
  })
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds_password.result
}

# RDS cluster instances
resource "aws_rds_cluster_instance" "main" {
  count = var.rds_config.multi_az ? 2 : 1
  
  identifier          = "linkedin-search-${var.environment}-${count.index + 1}"
  cluster_identifier  = aws_rds_cluster.main.id
  engine              = "aurora-postgresql"
  instance_class      = var.rds_config.instance_class
  
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  auto_minor_version_upgrade     = true
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  tags = merge(local.rds_tags, {
    Name = "linkedin-search-instance-${var.environment}-${count.index + 1}"
  })
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "linkedin-search-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.rds_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs
output "rds_cluster_endpoint" {
  description = "RDS cluster endpoint for writer connections"
  value       = aws_rds_cluster.main.endpoint
}

output "rds_reader_endpoint" {
  description = "RDS cluster endpoint for reader connections"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "rds_security_group_id" {
  description = "Security group ID for RDS cluster"
  value       = aws_security_group.rds.id
}

output "rds_secret_arn" {
  description = "ARN of the secret containing RDS master password"
  value       = aws_secretsmanager_secret.rds_password.arn
}