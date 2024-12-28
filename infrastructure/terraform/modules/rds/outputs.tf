# Primary writer endpoint for the RDS cluster
output "cluster_endpoint" {
  description = "Writer endpoint for the RDS cluster used for write operations in multi-AZ deployment"
  value       = aws_rds_cluster.this.endpoint
}

# Read replica endpoint for load balancing
output "reader_endpoint" {
  description = "Reader endpoint for the RDS cluster supporting read scaling and load balancing"
  value       = aws_rds_cluster.this.reader_endpoint
}

# Database connection port
output "port" {
  description = "Port number for database connections enabling secure network access"
  value       = aws_rds_cluster.this.port
}

# Security group ID for network access control
output "security_group_id" {
  description = "ID of the security group controlling database access and network security"
  value       = aws_security_group.this.id
}