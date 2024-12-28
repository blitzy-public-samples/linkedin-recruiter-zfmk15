# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# S3 Buckets for different data classifications
resource "aws_s3_bucket" "profile_data_bucket" {
  bucket        = "${var.environment}-linkedin-profile-data"
  force_destroy = false

  tags = merge(var.tags, {
    DataClassification = "High"
  })
}

resource "aws_s3_bucket" "analysis_results_bucket" {
  bucket        = "${var.environment}-linkedin-analysis-results"
  force_destroy = false

  tags = merge(var.tags, {
    DataClassification = "Medium"
  })
}

resource "aws_s3_bucket" "exports_bucket" {
  bucket        = "${var.environment}-linkedin-exports"
  force_destroy = true

  tags = merge(var.tags, {
    DataClassification = "Low"
  })
}

resource "aws_s3_bucket" "backup_bucket" {
  bucket        = "${var.environment}-linkedin-backups"
  force_destroy = false

  tags = merge(var.tags, {
    DataClassification = "High"
  })
}

# Enable versioning for all buckets
resource "aws_s3_bucket_versioning" "profile_data_versioning" {
  bucket = aws_s3_bucket.profile_data_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "analysis_results_versioning" {
  bucket = aws_s3_bucket.analysis_results_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "exports_versioning" {
  bucket = aws_s3_bucket.exports_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "backup_versioning" {
  bucket = aws_s3_bucket.backup_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configure server-side encryption for all buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "profile_data_encryption" {
  bucket = aws_s3_bucket.profile_data_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "analysis_results_encryption" {
  bucket = aws_s3_bucket.analysis_results_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "exports_encryption" {
  bucket = aws_s3_bucket.exports_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_encryption" {
  bucket = aws_s3_bucket.backup_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Configure lifecycle rules for data management
resource "aws_s3_bucket_lifecycle_rule" "profile_data_lifecycle" {
  bucket = aws_s3_bucket.profile_data_bucket.id
  enabled = true

  transition {
    days          = 90
    storage_class = "STANDARD_IA"
  }

  transition {
    days          = 365
    storage_class = "GLACIER"
  }
}

resource "aws_s3_bucket_lifecycle_rule" "analysis_results_lifecycle" {
  bucket = aws_s3_bucket.analysis_results_bucket.id
  enabled = true

  transition {
    days          = 30
    storage_class = "STANDARD_IA"
  }

  transition {
    days          = 90
    storage_class = "GLACIER"
  }
}

resource "aws_s3_bucket_lifecycle_rule" "exports_lifecycle" {
  bucket = aws_s3_bucket.exports_bucket.id
  enabled = true

  expiration {
    days = 30
  }
}

resource "aws_s3_bucket_lifecycle_rule" "backup_lifecycle" {
  bucket = aws_s3_bucket.backup_bucket.id
  enabled = true

  transition {
    days          = 30
    storage_class = "GLACIER"
  }
}

# Block public access for all buckets
resource "aws_s3_bucket_public_access_block" "profile_data_public_access_block" {
  bucket = aws_s3_bucket.profile_data_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "analysis_results_public_access_block" {
  bucket = aws_s3_bucket.analysis_results_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "exports_public_access_block" {
  bucket = aws_s3_bucket.exports_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "backup_public_access_block" {
  bucket = aws_s3_bucket.backup_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable logging for sensitive data buckets
resource "aws_s3_bucket_logging" "profile_data_logging" {
  bucket = aws_s3_bucket.profile_data_bucket.id

  target_bucket = aws_s3_bucket.backup_bucket.id
  target_prefix = "s3-access-logs/profile-data/"
}

resource "aws_s3_bucket_logging" "analysis_results_logging" {
  bucket = aws_s3_bucket.analysis_results_bucket.id

  target_bucket = aws_s3_bucket.backup_bucket.id
  target_prefix = "s3-access-logs/analysis-results/"
}

# Enforce SSL-only access for all buckets
resource "aws_s3_bucket_policy" "enforce_ssl" {
  for_each = {
    profile_data = aws_s3_bucket.profile_data_bucket.id
    analysis_results = aws_s3_bucket.analysis_results_bucket.id
    exports = aws_s3_bucket.exports_bucket.id
    backup = aws_s3_bucket.backup_bucket.id
  }

  bucket = each.value

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          "arn:aws:s3:::${each.value}",
          "arn:aws:s3:::${each.value}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}