# ─────────────────────────────────────────────────────────────────────────────
# EventBridge Scheduler: crons que disparan las Lambdas periódicas
# ─────────────────────────────────────────────────────────────────────────────

# ── overdue-tasks: cada hora (HU-17) ─────────────────────────────────────────
resource "aws_cloudwatch_event_rule" "overdue_tasks" {
  name                = "${local.name_prefix}-overdue-hourly"
  description         = "Detecta tareas vencidas cada hora"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "overdue_tasks" {
  rule = aws_cloudwatch_event_rule.overdue_tasks.name
  arn  = aws_lambda_function.overdue_tasks.arn
}

resource "aws_lambda_permission" "overdue_tasks" {
  statement_id  = "AllowEventBridgeOverdue"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.overdue_tasks.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.overdue_tasks.arn
}

# ── alerts-engine: diario 09:00 UTC (HU-19) ─────────────────────────────────
resource "aws_cloudwatch_event_rule" "alerts_engine" {
  name                = "${local.name_prefix}-alerts-daily"
  description         = "Evalúa proyectos en riesgo (>30% vencidas) diariamente"
  schedule_expression = "cron(0 9 * * ? *)"
}

resource "aws_cloudwatch_event_target" "alerts_engine" {
  rule = aws_cloudwatch_event_rule.alerts_engine.name
  arn  = aws_lambda_function.alerts_engine.arn
}

resource "aws_lambda_permission" "alerts_engine" {
  statement_id  = "AllowEventBridgeAlerts"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alerts_engine.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.alerts_engine.arn
}

# ── scheduled-reports: semanal, lunes 08:00 UTC (HU-18) ─────────────────────
resource "aws_cloudwatch_event_rule" "scheduled_reports" {
  name                = "${local.name_prefix}-reports-weekly"
  description         = "Genera reportes CSV semanales (lunes) por proyecto"
  schedule_expression = "cron(0 8 ? * MON *)"
}

resource "aws_cloudwatch_event_target" "scheduled_reports" {
  rule = aws_cloudwatch_event_rule.scheduled_reports.name
  arn  = aws_lambda_function.scheduled_reports.arn
}

resource "aws_lambda_permission" "scheduled_reports" {
  statement_id  = "AllowEventBridgeReports"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_reports.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduled_reports.arn
}
