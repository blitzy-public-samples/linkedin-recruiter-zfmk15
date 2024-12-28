# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# WAF Web ACL for comprehensive application protection
resource "aws_wafv2_web_acl" "main" {
  name        = "linkedin-search-waf"
  description = "WAF rules for LinkedIn Profile Search System with advanced protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Managed Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rate Limiting Rule
  rule {
    name     = "RateLimitRule"
    priority = 2

    action {
      block {
        custom_response {
          response_code             = 429
          custom_response_body_key  = "TooManyRequests"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRuleMetric"
      sampled_requests_enabled  = true
    }
  }

  # SQL Injection Protection
  rule {
    name     = "SQLInjectionRule"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SQLInjectionRuleMetric"
      sampled_requests_enabled  = true
    }
  }

  # XSS Protection
  rule {
    name     = "XSSProtectionRule"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "XSSProtectionRuleMetric"
      sampled_requests_enabled  = true
    }
  }

  # Custom response body for rate limiting
  custom_response_body {
    key           = "TooManyRequests"
    content       = jsonencode({
      error  = "Too many requests"
      status = 429
    })
    content_type  = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "LinkedInSearchWAFMetrics"
    sampled_requests_enabled  = true
  }

  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
  }
}

# IP Set for managing blocked IP addresses
resource "aws_wafv2_ip_set" "blocked_ips" {
  name               = "linkedin-search-blocked-ips"
  description        = "Blocked IP addresses for LinkedIn Search System"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = [] # Empty by default, to be managed dynamically

  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
  }
}

# Associate WAF Web ACL with Application Load Balancer
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# CloudWatch logging for WAF
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn           = aws_wafv2_web_acl.main.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

# CloudWatch Log Group for WAF logs
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "/aws/waf/linkedin-search"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = "linkedin-search"
    ManagedBy   = "terraform"
  }
}