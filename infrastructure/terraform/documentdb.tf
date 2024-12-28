# AWS DocumentDB Cluster Configuration
# Provider version: ~> 5.0

# Random password generation for master user
resource "random_password" "docdb_master_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# AWS Secrets Manager secret for storing DocumentDB credentials
resource "aws_secretsmanager_secret" "docdb_credentials" {
  name        = "/${var.environment}/documentdb/master-credentials"
  description = "DocumentDB master credentials for ${var.environment} environment"
  kms_key_id  = data.aws_kms_key.kms_key_arn.arn
  
  tags = merge(
    local.common_tags,
    {
      Name = "documentdb-master-credentials-${var.environment}"
    }
  )
}

# Store the credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret_version" "docdb_credentials" {
  secret_id = aws_secretsmanager_secret.docdb_credentials.id
  secret_string = jsonencode({
    username = "docdb_admin"
    password = random_password.docdb_master_password.result
  })
}

# DocumentDB subnet group
resource "aws_docdb_subnet_group" "docdb" {
  name        = "docdb-subnet-group-${var.environment}"
  description = "DocumentDB subnet group for ${var.environment} environment"
  subnet_ids  = var.vpc_config.private_subnets
  
  tags = merge(
    local.common_tags,
    {
      Name = "docdb-subnet-group-${var.environment}"
    }
  )
}

# DocumentDB parameter group
resource "aws_docdb_cluster_parameter_group" "docdb" {
  family      = "docdb4.0"
  name        = "docdb-params-${var.environment}"
  description = "DocumentDB cluster parameter group for ${var.environment}"

  parameter {
    name  = "tls"
    value = "enabled"
  }
  
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "docdb-params-${var.environment}"
    }
  )
}

# DocumentDB cluster
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier              = "docdb-cluster-${var.environment}"
  engine                         = "docdb"
  engine_version                 = "4.0.0"
  master_username                = jsondecode(aws_secretsmanager_secret_version.docdb_credentials.secret_string)["username"]
  master_password                = jsondecode(aws_secretsmanager_secret_version.docdb_credentials.secret_string)["password"]
  backup_retention_period        = var.documentdb_config.backup_retention_period
  preferred_backup_window        = var.documentdb_config.preferred_backup_window
  preferred_maintenance_window   = var.documentdb_config.preferred_maintenance_window
  db_subnet_group_name          = aws_docdb_subnet_group.docdb.name
  vpc_security_group_ids        = var.vpc_config.security_group_ids
  storage_encrypted             = true
  kms_key_id                    = data.aws_kms_key.kms_key_arn.arn
  deletion_protection           = var.environment == "prod" ? true : false
  skip_final_snapshot          = var.environment == "prod" ? false : true
  final_snapshot_identifier    = var.environment == "prod" ? "docdb-final-snapshot-${var.environment}" : null
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.docdb.name
  
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]
  
  tags = merge(
    local.common_tags,
    {
      Name = "docdb-cluster-${var.environment}"
    }
  )
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "docdb_instances" {
  count              = var.documentdb_config.cluster_size
  identifier         = "docdb-instance-${var.environment}-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = var.documentdb_config.instance_class
  
  auto_minor_version_upgrade = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "docdb-instance-${var.environment}-${count.index + 1}"
    }
  )
}

# Local variables
locals {
  common_tags = {
    Environment = var.environment
    Project     = "linkedin-profile-search"
    ManagedBy   = "terraform"
  }
}

# Outputs
output "docdb_cluster" {
  description = "DocumentDB cluster information"
  value = {
    cluster_endpoint    = aws_docdb_cluster.docdb.endpoint
    cluster_port        = aws_docdb_cluster.docdb.port
    instance_endpoints  = aws_docdb_cluster_instance.docdb_instances[*].endpoint
    cluster_resource_id = aws_docdb_cluster.docdb.cluster_resource_id
    cluster_members     = aws_docdb_cluster.docdb.cluster_members
    master_username     = jsondecode(aws_secretsmanager_secret_version.docdb_credentials.secret_string)["username"]
  }
  sensitive = true
}