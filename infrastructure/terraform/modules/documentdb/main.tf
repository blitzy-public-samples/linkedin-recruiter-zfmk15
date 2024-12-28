# AWS DocumentDB Terraform Module
# AWS Provider version ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  cluster_identifier           = "${var.project}-${var.environment}-docdb"
  parameter_group_family      = "docdb4.0"
  port                        = 27017
  backup_retention_period     = var.backup_retention_period
  preferred_backup_window     = "03:00-04:00"
  preferred_maintenance_window = "mon:04:00-mon:05:00"
  instance_class              = var.instance_class
  auto_minor_version_upgrade  = true
}

# Security group for DocumentDB cluster
resource "aws_security_group" "docdb" {
  name_prefix = "${local.cluster_identifier}-sg"
  vpc_id      = var.vpc_id
  description = "Security group for ${local.cluster_identifier} DocumentDB cluster"

  ingress {
    from_port       = local.port
    to_port         = local.port
    protocol        = "tcp"
    self            = true
    description     = "Allow inbound MongoDB traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${local.cluster_identifier}-sg"
  })
}

# DocumentDB subnet group for multi-AZ deployment
resource "aws_docdb_subnet_group" "docdb" {
  name        = "${local.cluster_identifier}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${local.cluster_identifier} DocumentDB cluster"

  tags = merge(var.tags, {
    Name = "${local.cluster_identifier}-subnet-group"
  })
}

# DocumentDB cluster parameter group
resource "aws_docdb_cluster_parameter_group" "docdb" {
  family      = local.parameter_group_family
  name        = "${local.cluster_identifier}-params"
  description = "Parameter group for ${local.cluster_identifier} DocumentDB cluster"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${local.cluster_identifier}-params"
  })
}

# DocumentDB cluster
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier              = local.cluster_identifier
  engine                         = "docdb"
  engine_version                 = "4.0.0"
  master_username                = "docdbadmin"
  master_password                = random_password.master_password.result
  port                          = local.port
  db_subnet_group_name          = aws_docdb_subnet_group.docdb.name
  vpc_security_group_ids        = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.docdb.name
  
  backup_retention_period      = local.backup_retention_period
  preferred_backup_window     = local.preferred_backup_window
  preferred_maintenance_window = local.preferred_maintenance_window
  
  storage_encrypted           = true
  kms_key_id                 = var.kms_key_arn
  
  deletion_protection        = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.cluster_identifier}-final-snapshot"
  
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = merge(var.tags, {
    Name = local.cluster_identifier
  })
}

# Random password generation for master user
resource "random_password" "master_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "docdb" {
  count                   = var.cluster_size
  identifier             = "${local.cluster_identifier}-${count.index + 1}"
  cluster_identifier     = aws_docdb_cluster.docdb.id
  instance_class         = local.instance_class
  engine                = "docdb"
  
  auto_minor_version_upgrade = local.auto_minor_version_upgrade
  
  tags = merge(var.tags, {
    Name = "${local.cluster_identifier}-${count.index + 1}"
  })
}

# Store master password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "docdb_master" {
  name        = "${local.cluster_identifier}-master-credentials"
  description = "Master credentials for ${local.cluster_identifier} DocumentDB cluster"
  kms_key_id  = var.kms_key_arn
  
  tags = merge(var.tags, {
    Name = "${local.cluster_identifier}-master-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "docdb_master" {
  secret_id = aws_secretsmanager_secret.docdb_master.id
  secret_string = jsonencode({
    username = aws_docdb_cluster.docdb.master_username
    password = random_password.master_password.result
    endpoint = aws_docdb_cluster.docdb.endpoint
    port     = aws_docdb_cluster.docdb.port
  })
}