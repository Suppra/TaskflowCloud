# ─────────────────────────────────────────────────────────────────────────────
# Valores derivados reutilizables
# ─────────────────────────────────────────────────────────────────────────────
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Nombres de tablas DynamoDB (deben coincidir con los del código backend/lambdas)
  dynamodb_tables = {
    users         = "taskflow-users"
    projects      = "taskflow-projects"
    boards        = "taskflow-boards"
    tasks         = "taskflow-tasks"
    notifications = "taskflow-notifications"
    alerts        = "taskflow-alerts"
    reports       = "taskflow-reports"
    comments      = "taskflow-comments"
  }

  lambdas = {
    notifications     = "lambdas/notifications"
    overdue_tasks     = "lambdas/overdue-tasks"
    alerts_engine     = "lambdas/alerts-engine"
    scheduled_reports = "lambdas/scheduled-reports"
  }
}
