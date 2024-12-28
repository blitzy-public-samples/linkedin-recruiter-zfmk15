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
  vpc_tags = merge(var.tags, {
    Component   = "networking"
    Environment = terraform.workspace
    ManagedBy   = "terraform"
  })
  
  flow_logs_tags = merge(local.vpc_tags, {
    Component = "vpc-flow-logs"
  })
}

# VPC Resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_config.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(local.vpc_tags, {
    Name = "${terraform.workspace}-main-vpc"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.vpc_config.public_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.vpc_config.public_subnets[count.index]
  availability_zone = var.vpc_config.azs[count.index]
  
  map_public_ip_on_launch = true

  tags = merge(local.vpc_tags, {
    Name                                          = "${terraform.workspace}-public-${var.vpc_config.azs[count.index]}"
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/${terraform.workspace}" = "shared"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.vpc_config.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.vpc_config.private_subnets[count.index]
  availability_zone = var.vpc_config.azs[count.index]

  tags = merge(local.vpc_tags, {
    Name                                          = "${terraform.workspace}-private-${var.vpc_config.azs[count.index]}"
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/${terraform.workspace}" = "shared"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.vpc_tags, {
    Name = "${terraform.workspace}-igw"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = length(var.vpc_config.public_subnets)
  domain = "vpc"

  tags = merge(local.vpc_tags, {
    Name = "${terraform.workspace}-nat-eip-${count.index + 1}"
  })
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = length(var.vpc_config.public_subnets)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.vpc_tags, {
    Name = "${terraform.workspace}-nat-gw-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.vpc_tags, {
    Name = "${terraform.workspace}-public-rt"
  })
}

# Private Route Tables
resource "aws_route_table" "private" {
  count  = length(var.vpc_config.private_subnets)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(local.vpc_tags, {
    Name = "${terraform.workspace}-private-rt-${count.index + 1}"
  })
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(var.vpc_config.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.vpc_config.private_subnets)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  count                = var.vpc_config.enable_flow_logs ? 1 : 0
  iam_role_arn        = aws_iam_role.flow_logs[0].arn
  log_destination     = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type        = "ALL"
  vpc_id              = aws_vpc.main.id
  
  tags = local.flow_logs_tags
}

# CloudWatch Log Group for Flow Logs
resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.vpc_config.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/flow-logs/${terraform.workspace}"
  retention_in_days = var.vpc_config.flow_logs_retention_days

  tags = local.flow_logs_tags
}

# IAM Role for Flow Logs
resource "aws_iam_role" "flow_logs" {
  count = var.vpc_config.enable_flow_logs ? 1 : 0
  name  = "${terraform.workspace}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = local.flow_logs_tags
}

# IAM Policy for Flow Logs
resource "aws_iam_role_policy" "flow_logs" {
  count = var.vpc_config.enable_flow_logs ? 1 : 0
  name  = "${terraform.workspace}-vpc-flow-logs-policy"
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "private_subnets" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnets" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "nat_gateway_ips" {
  description = "List of NAT Gateway Elastic IPs"
  value       = aws_eip.nat[*].public_ip
}

output "flow_logs_group" {
  description = "Name of the VPC Flow Logs CloudWatch Log Group"
  value       = var.vpc_config.enable_flow_logs ? aws_cloudwatch_log_group.flow_logs[0].name : null
}