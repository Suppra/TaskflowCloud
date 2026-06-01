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

# ── SES ──────────────────────────────────────────────────────────────────────
# Verifica el dominio si está configurado; de lo contrario, verifica el email.
resource "aws_ses_email_identity" "from" {
  count = var.domain_name == "" ? 1 : 0
  email = var.ses_from_email
}

resource "aws_ses_domain_identity" "main" {
  count  = var.domain_name != "" ? 1 : 0
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  count  = var.domain_name != "" ? 1 : 0
  domain = aws_ses_domain_identity.main[0].domain
}
