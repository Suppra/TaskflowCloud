# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "DNS público del ALB (endpoint del API si no usas dominio)"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "URL pública de la aplicación en ALB"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR para push de la imagen del backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "sqs_queue_url" {
  description = "URL de la cola de eventos SQS"
  value       = aws_sqs_queue.events.url
}

output "user_notifications_topic_arn" {
  description = "ARN del topic SNS para correos transaccionales por suscripcion"
  value       = aws_sns_topic.user_notifications.arn
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
