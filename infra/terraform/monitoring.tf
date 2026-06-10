# ─────────────────────────────────────────────────────────────────────────────
# CloudWatch: log groups de Lambdas + alarmas + SNS para notificar las alarmas
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = local.lambdas
  name              = "/aws/lambda/${local.name_prefix}-${replace(each.key, "_", "-")}"
  retention_in_days = var.log_retention_days
}

# ── SNS topic para alertas operativas ────────────────────────────────────────
# Sin esto, las alarmas disparan "al vacío" (nadie se entera). El topic permite
# enviar email/SMS/Slack cuando una alarma cambia a estado ALARM.
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-ops-alerts"
}

# Suscripción por email — solo si se configuró una dirección de alertas.
resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.alerts_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alerts_email
}

# ── Alarma: mensajes acumulados en la DLQ (eventos que fallaron 5 veces) ─────
resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  alarm_name          = "${local.name_prefix}-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Hay eventos en la DLQ — revisar fallos de la Lambda notifications"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.events_dlq.name
  }
}

# ── Alarma: errores 5xx en el ALB ────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name_prefix}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Tasa elevada de errores 5xx en el backend"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}
