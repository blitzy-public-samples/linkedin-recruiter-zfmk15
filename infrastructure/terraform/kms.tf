# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Common KMS key policy document for all keys
data "aws_iam_policy_document" "kms_key_policy" {
  # Allow root account full access
  statement {
    sid    = "EnableRootAccountAccess"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  # Allow key administrators to manage the key
  statement {
    sid    = "EnableKeyAdministration"
    effect = "Allow"
    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/KeyAdministrator"
      ]
    }
    actions = [
      "kms:Create*",
      "kms:Describe*",
      "kms:Enable*",
      "kms:List*",
      "kms:Put*",
      "kms:Update*",
      "kms:Revoke*",
      "kms:Disable*",
      "kms:Get*",
      "kms:Delete*",
      "kms:ScheduleKeyDeletion",
      "kms:CancelKeyDeletion"
    ]
    resources = ["*"]
  }

  # Allow CloudWatch to use the key for log encryption
  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["logs.${var.region}.amazonaws.com"]
    }
    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*"
    ]
    resources = ["*"]
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# KMS key for RDS encryption
resource "aws_kms_key" "rds_kms_key" {
  description              = "KMS key for RDS database encryption"
  deletion_window_in_days  = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Environment     = var.environment
    Project         = "linkedin-profile-search"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceScope = "gdpr,soc2,iso27001"
    Service         = "rds"
  }
}

# KMS key alias for RDS
resource "aws_kms_alias" "rds_kms_alias" {
  name          = "alias/linkedin-profile-search-rds-${var.environment}"
  target_key_id = aws_kms_key.rds_kms_key.key_id
}

# KMS key for DocumentDB encryption
resource "aws_kms_key" "documentdb_kms_key" {
  description              = "KMS key for DocumentDB encryption"
  deletion_window_in_days  = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Environment     = var.environment
    Project         = "linkedin-profile-search"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceScope = "gdpr,soc2,iso27001"
    Service         = "documentdb"
  }
}

# KMS key alias for DocumentDB
resource "aws_kms_alias" "documentdb_kms_alias" {
  name          = "alias/linkedin-profile-search-documentdb-${var.environment}"
  target_key_id = aws_kms_key.documentdb_kms_key.key_id
}

# KMS key for ElastiCache encryption
resource "aws_kms_key" "elasticache_kms_key" {
  description              = "KMS key for ElastiCache encryption"
  deletion_window_in_days  = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Environment     = var.environment
    Project         = "linkedin-profile-search"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceScope = "gdpr,soc2,iso27001"
    Service         = "elasticache"
  }
}

# KMS key alias for ElastiCache
resource "aws_kms_alias" "elasticache_kms_alias" {
  name          = "alias/linkedin-profile-search-elasticache-${var.environment}"
  target_key_id = aws_kms_key.elasticache_kms_key.key_id
}

# KMS key for application-level encryption
resource "aws_kms_key" "application_kms_key" {
  description              = "KMS key for application-level encryption"
  deletion_window_in_days  = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Environment     = var.environment
    Project         = "linkedin-profile-search"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceScope = "gdpr,soc2,iso27001"
    Service         = "application"
  }
}

# KMS key alias for application
resource "aws_kms_alias" "application_kms_alias" {
  name          = "alias/linkedin-profile-search-application-${var.environment}"
  target_key_id = aws_kms_key.application_kms_key.key_id
}

# CloudWatch Log Group for KMS key usage monitoring
resource "aws_cloudwatch_log_group" "kms_monitoring" {
  name              = "/aws/kms/linkedin-profile-search-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment     = var.environment
    Project         = "linkedin-profile-search"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceScope = "gdpr,soc2,iso27001"
  }
}