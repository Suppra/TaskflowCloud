# ─────────────────────────────────────────────────────────────────────────────
# ECS Fargate: cluster, task definition, servicio, ALB y autoscaling
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
}

# ── Task definition ──────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
    essential = true

    portMappings = [{
      containerPort = var.backend_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.backend_port) },
      { name = "AWS_REGION", value = local.region },
      { name = "S3_BUCKET_ATTACHMENTS", value = aws_s3_bucket.attachments.bucket },
      { name = "S3_BUCKET_REPORTS", value = aws_s3_bucket.reports.bucket },
      { name = "SQS_QUEUE_URL", value = aws_sqs_queue.events.url },
      { name = "SES_FROM_EMAIL", value = var.ses_from_email },
      { name = "JWT_EXPIRES_IN", value = var.jwt_expires_in },
      { name = "JWT_REFRESH_EXPIRES_IN", value = var.jwt_refresh_expires_in },
      { name = "MAX_TASKS_PER_MEMBER", value = tostring(var.max_tasks_per_member) },
      { name = "FRONTEND_URL", value = var.domain_name != "" ? "https://${var.domain_name}" : "http://localhost:5173" },
      { name = "CORS_ORIGINS", value = var.domain_name != "" ? "https://${var.domain_name}" : "http://localhost:5173" },
    ]

    # Secretos inyectados desde Secrets Manager (nunca en texto plano)
    secrets = [
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.jwt.arn}:JWT_SECRET::" },
      { name = "JWT_REFRESH_SECRET", valueFrom = "${aws_secretsmanager_secret.jwt.arn}:JWT_REFRESH_SECRET::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "backend"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:${var.backend_port}/api/v1/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])
}

# ── Servicio ─────────────────────────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.backend_port
  }

  depends_on = [aws_lb_listener.http]
}

# ── Autoscaling por CPU ──────────────────────────────────────────────────────
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 6
  min_capacity       = var.backend_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 65.0
  }
}
