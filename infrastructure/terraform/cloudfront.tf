# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Origin Access Identity for S3 bucket access
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "Origin Access Identity for LinkedIn Profile Search web assets"
}

# Main CloudFront Distribution
resource "aws_cloudfront_distribution" "web_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "LinkedIn Profile Search and Analysis System Distribution"
  price_class         = "PriceClass_All"
  http_version        = "http2and3"
  web_acl_id          = aws_waf_web_acl.main.id
  default_root_object = "index.html"
  aliases             = ["${var.environment}.linkedin-search.example.com"]
  wait_for_deployment = true

  # S3 Origin for static assets and exports
  origin {
    domain_name = aws_s3_bucket.exports_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.exports_bucket.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }

    custom_header {
      name  = "X-Environment"
      value = var.environment
    }
  }

  # API Gateway Origin
  origin {
    domain_name = aws_lb.api_gateway.dns_name
    origin_id   = "API-Gateway"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 30
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = random_string.origin_verify.result
    }
  }

  # Default cache behavior for static assets
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.exports_bucket.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # API Gateway cache behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API-Gateway"

    forwarded_values {
      query_string = true
      headers      = [
        "Authorization",
        "Origin",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method"
      ]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_security.arn
    }
  }

  # Custom error responses
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = var.security_config.ssl_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # WAF integration and logging
  logging_config {
    include_cookies = false
    bucket         = "${aws_s3_bucket.exports_bucket.bucket}.s3.amazonaws.com"
    prefix         = "cloudfront-logs/"
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-cloudfront-distribution"
    Service     = "LinkedIn Profile Search"
    Component   = "CDN"
    Managed_By  = "Terraform"
  })
}

# CloudFront security headers function
resource "aws_cloudfront_function" "security_headers" {
  name    = "${var.environment}-security-headers"
  runtime = "cloudfront-js-1.0"
  comment = "Add security headers to static content responses"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var response = event.response;
      var headers = response.headers;
      
      headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubdomains; preload'};
      headers['x-content-type-options'] = { value: 'nosniff'};
      headers['x-frame-options'] = { value: 'DENY'};
      headers['x-xss-protection'] = { value: '1; mode=block'};
      headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin'};
      headers['content-security-policy'] = { value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"};
      
      return response;
    }
  EOT
}

# CloudFront API security function
resource "aws_cloudfront_function" "api_security" {
  name    = "${var.environment}-api-security"
  runtime = "cloudfront-js-1.0"
  comment = "Add security headers and validate API requests"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var headers = request.headers;
      
      // Validate origin verification header
      if (!headers['x-origin-verify'] || headers['x-origin-verify'].value !== '${random_string.origin_verify.result}') {
        return {
          statusCode: 403,
          statusDescription: 'Forbidden'
        };
      }
      
      // Add security headers
      headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubdomains; preload'};
      headers['x-content-type-options'] = { value: 'nosniff'};
      
      return request;
    }
  EOT
}

# Random string for origin verification
resource "random_string" "origin_verify" {
  length  = 32
  special = false
}

# S3 bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = aws_s3_bucket.exports_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAI"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.exports_bucket.arn}/*"
      }
    ]
  })
}

# Output values
output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.web_distribution.id
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.web_distribution.domain_name
}

output "cloudfront_distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.web_distribution.arn
}