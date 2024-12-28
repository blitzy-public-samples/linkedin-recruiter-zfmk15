# Cluster identification and access outputs
output "cluster_identifier" {
  value       = aws_docdb_cluster.docdb.cluster_identifier
  description = "Unique identifier of the DocumentDB cluster"
}

output "cluster_endpoint" {
  value       = aws_docdb_cluster.docdb.endpoint
  description = "Primary endpoint for write operations to the DocumentDB cluster"
}

output "read_endpoint" {
  value       = aws_docdb_cluster.docdb.reader_endpoint
  description = "Load-balanced endpoint for read operations across cluster instances"
}

output "cluster_port" {
  value       = aws_docdb_cluster.docdb.port
  description = "Port number for DocumentDB cluster connections"
}

output "instance_endpoints" {
  value = [
    for instance in aws_docdb_cluster_instance.docdb : instance.endpoint
  ]
  description = "List of individual instance endpoints for direct instance access"
}

# Secure connection string with sensitive flag
output "connection_string" {
  value = format(
    "mongodb://%s:%s@%s:%s/%s?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false",
    aws_docdb_cluster.docdb.master_username,
    random_password.master_password.result,
    aws_docdb_cluster.docdb.endpoint,
    aws_docdb_cluster.docdb.port,
    "admin"
  )
  description = "MongoDB-compatible connection string for secure cluster access"
  sensitive   = true
}

# Resource identifiers and ARNs
output "cluster_arn" {
  value       = aws_docdb_cluster.docdb.arn
  description = "Amazon Resource Name (ARN) of the DocumentDB cluster"
}

# Maintenance and backup windows
output "maintenance_window" {
  value       = aws_docdb_cluster.docdb.preferred_maintenance_window
  description = "Time window during which cluster maintenance will be performed"
}

output "backup_window" {
  value       = aws_docdb_cluster.docdb.preferred_backup_window
  description = "Time window during which automated backups will be performed"
}

# Security and network configuration
output "security_group_id" {
  value       = aws_security_group.docdb.id
  description = "ID of the security group attached to the DocumentDB cluster"
}

output "subnet_group_name" {
  value       = aws_docdb_subnet_group.docdb.name
  description = "Name of the subnet group used by the DocumentDB cluster"
}

# Secret management
output "master_secret_arn" {
  value       = aws_secretsmanager_secret.docdb_master.arn
  description = "ARN of the Secrets Manager secret containing master credentials"
}

# High availability configuration
output "availability_zones" {
  value = [
    for instance in aws_docdb_cluster_instance.docdb : instance.availability_zone
  ]
  description = "List of Availability Zones where cluster instances are deployed"
}

# Monitoring and logging
output "cloudwatch_log_exports" {
  value       = aws_docdb_cluster.docdb.enabled_cloudwatch_logs_exports
  description = "List of log types being exported to CloudWatch"
}