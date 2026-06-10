# ─────────────────────────────────────────────────────────────────────────────
# SQS (cola de eventos + DLQ) y SES (envío de emails)
# El backend publica eventos en esta cola; la Lambda `notifications` los consume.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_sqs_queue" "events_dlq" {
  name                      = "${local.name_prefix}-events-dlq"
  message_retention_seconds = 1209600 # 14 días
  tags                      = { Name = "${local.name_prefix}-events-dlq" }
}

resource "aws_sqs_queue" "events" {
  name                       = "${local.name_prefix}-events"
  visibility_timeout_seconds = 60     # ≥ timeout de la Lambda consumidora
  message_retention_seconds  = 345600 # 4 días

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.events_dlq.arn
    maxReceiveCount     = 5
  })

  tags = { Name = "${local.name_prefix}-events" }
}

# Topic SNS para emails transaccionales a usuarios finales.
# Cada usuario se suscribe con filtro por atributo `recipient` (su email).
resource "aws_sns_topic" "user_notifications" {
  name = "${local.name_prefix}-user-notifications"
}

# ── SES ──────────────────────────────────────────────────────────────────────
# En Learner Lab, la verificación de identidad puede requerir hacerlo manualmente.
