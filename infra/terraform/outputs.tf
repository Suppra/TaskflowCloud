# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "DNS público del ALB (endpoint del API si no usas dominio)"
  value       = aws_lb.main.dns_name
}

output "api_url" {
  description = "URL base del API"
  value       = var.create_route53 && var.domain_name != "" ? "https://api.${var.domain_name}/api/v1" : "http://${aws_lb.main.dns_name}/api/v1"
}

output "frontend_url" {
  description = "URL del frontend (CloudFront)"
  value       = var.create_route53 && var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR para push de la imagen del backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket" {
  description = "Bucket S3 donde subir el build del frontend (aws s3 sync)"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "ID de la distribución CloudFront (para invalidaciones tras deploy)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "sqs_queue_url" {
  description = "URL de la cola de eventos SQS"
  value       = aws_sqs_queue.events.url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "dynamodb_tables" {
  description = "Nombres de las tablas DynamoDB creadas"
  value       = local.dynamodb_tables
}
