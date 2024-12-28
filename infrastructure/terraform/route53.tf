# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary hosted zone for the application domain
resource "aws_route53_zone" "main" {
  name = var.environment == "prod" ? "linkedin-search.com" : "${var.environment}.linkedin-search.com"
  
  comment = "Managed by Terraform - LinkedIn Profile Search System"
  
  # VPC association for private DNS
  vpc {
    vpc_id = var.vpc_config.vpc_id
  }
  
  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
    CostCenter  = "infrastructure"
  }
}

# DNSSEC configuration for enhanced security
resource "aws_kms_key" "dnssec" {
  customer_master_key_spec = "ECC_NIST_P256"
  deletion_window_in_days  = 7
  key_usage               = "SIGN_VERIFY"
  enable_key_rotation     = true
  
  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
  }
}

resource "aws_route53_key_signing_key" "main" {
  hosted_zone_id             = aws_route53_zone.main.id
  key_management_service_arn = aws_kms_key.dnssec.arn
  name                       = "linkedin-search-key"
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  hosted_zone_id = aws_route53_zone.main.id
}

# Primary A record for web application
resource "aws_route53_record" "web_primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? "www" : var.environment
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.web_distribution.hosted_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier = "primary"
  health_check_id = aws_route53_health_check.web_primary.id
}

# Secondary A record for failover
resource "aws_route53_record" "web_secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? "www" : var.environment
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.web_distribution.hosted_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "secondary"
  health_check_id = aws_route53_health_check.web_secondary.id
}

# Primary health check configuration
resource "aws_route53_health_check" "web_primary" {
  fqdn              = var.environment == "prod" ? "www.linkedin-search.com" : "${var.environment}.linkedin-search.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "5"
  request_interval  = "30"
  
  regions = ["us-west-1", "us-east-1", "eu-west-1"]
  
  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
    Type        = "primary"
  }

  search_string = "\"status\":\"healthy\""
  measure_latency = true
  enable_sni      = true
}

# Secondary health check configuration
resource "aws_route53_health_check" "web_secondary" {
  fqdn              = var.environment == "prod" ? "www.linkedin-search.com" : "${var.environment}.linkedin-search.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"
  
  regions = ["us-west-2", "us-east-2", "eu-central-1"]
  
  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
    Type        = "secondary"
  }

  search_string = "\"status\":\"healthy\""
  measure_latency = true
  enable_sni      = true
}

# API subdomain record
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.environment == "prod" ? "linkedin-search.com" : "${var.environment}.linkedin-search.com"}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.web_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}

# DNS query logging configuration
resource "aws_cloudwatch_log_group" "dns_logs" {
  name              = "/aws/route53/${var.environment}-linkedin-search-dns-logs"
  retention_in_days = 30
  
  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
  }
}

resource "aws_route53_query_log" "main" {
  depends_on = [aws_cloudwatch_log_group.dns_logs]

  cloudwatch_log_group_arn = aws_cloudwatch_log_group.dns_logs.arn
  zone_id                  = aws_route53_zone.main.id
}

# Outputs for use in other modules
output "route53_zone_id" {
  description = "The ID of the Route53 hosted zone"
  value       = aws_route53_zone.main.zone_id
}

output "route53_name_servers" {
  description = "The name servers for the Route53 hosted zone"
  value       = aws_route53_zone.main.name_servers
}

output "route53_zone_name" {
  description = "The name of the Route53 hosted zone"
  value       = aws_route53_zone.main.name
}