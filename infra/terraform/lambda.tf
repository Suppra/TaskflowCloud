# ─────────────────────────────────────────────────────────────────────────────
# Lambdas event-driven + triggers (SQS event source mapping + EventBridge crons)
#
# El código se empaqueta con archive_file desde el directorio de cada Lambda.
# Para producción real, el zip lo construye CI (npm ci --production) y se sube
# vía `terraform apply` o `aws lambda update-function-code`.
# ─────────────────────────────────────────────────────────────────────────────

locals {
  lambda_runtime = "nodejs20.x"
  repo_root      = "${path.module}/../.."
}

# Empaquetado simple del código fuente de cada Lambda.
data "archive_file" "notifications" {
  type        = "zip"
  source_dir  = "${local.repo_root}/lambdas/notifications"
  output_path = "${path.module}/.build/notifications.zip"
}

data "archive_file" "overdue_tasks" {
  type        = "zip"
  source_dir  = "${local.repo_root}/lambdas/overdue-tasks"
  output_path = "${path.module}/.build/overdue-tasks.zip"
}

data "archive_file" "alerts_engine" {
  type        = "zip"
  source_dir  = "${local.repo_root}/lambdas/alerts-engine"
  output_path = "${path.module}/.build/alerts-engine.zip"
}

# scheduled-reports depende de `pdfkit`, que NO viene en el runtime de Lambda.
# Este null_resource instala las dependencias de producción ANTES de empaquetar.
# Se re-ejecuta cuando cambia package.json o el código de la Lambda.
resource "null_resource" "scheduled_reports_deps" {
  triggers = {
    package_json = filemd5("${local.repo_root}/lambdas/scheduled-reports/package.json")
    index_js     = filemd5("${local.repo_root}/lambdas/scheduled-reports/index.js")
  }

  provisioner "local-exec" {
    working_dir = "${local.repo_root}/lambdas/scheduled-reports"
    command     = "npm install --omit=dev --no-audit --no-fund"
  }
}

data "archive_file" "scheduled_reports" {
  type        = "zip"
  source_dir  = "${local.repo_root}/lambdas/scheduled-reports"
  output_path = "${path.module}/.build/scheduled-reports.zip"

  # Fuerza a que el zip se cree DESPUÉS de instalar node_modules,
  # de modo que pdfkit quede incluido en el artefacto.
  depends_on = [null_resource.scheduled_reports_deps]
}

locals {
  lambda_env = {
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    SES_FROM_EMAIL                      = var.ses_from_email
    SES_ENABLED                         = tostring(var.ses_enabled)
    USER_NOTIFICATIONS_TOPIC_ARN        = aws_sns_topic.user_notifications.arn
    SQS_QUEUE_URL                       = aws_sqs_queue.events.url
    S3_BUCKET_REPORTS                   = aws_s3_bucket.reports.bucket
    FRONTEND_URL                        = "http://${aws_lb.main.dns_name}"
  }
}

# ── 1) notifications: consume SQS → SES + DynamoDB ───────────────────────────
resource "aws_lambda_function" "notifications" {
  function_name    = "${local.name_prefix}-notifications"
  role             = data.aws_iam_role.lab.arn
  runtime          = local.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.notifications.output_path
  source_code_hash = data.archive_file.notifications.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment { variables = local.lambda_env }
}

resource "aws_lambda_event_source_mapping" "notifications_sqs" {
  event_source_arn                   = aws_sqs_queue.events.arn
  function_name                      = aws_lambda_function.notifications.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
}

# ── 2) overdue-tasks: cron horario → marca vencidas → notifica ───────────────
resource "aws_lambda_function" "overdue_tasks" {
  function_name    = "${local.name_prefix}-overdue-tasks"
  role             = data.aws_iam_role.lab.arn
  runtime          = local.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.overdue_tasks.output_path
  source_code_hash = data.archive_file.overdue_tasks.output_base64sha256
  timeout          = 60
  memory_size      = 256

  environment { variables = local.lambda_env }
}

# ── 3) alerts-engine: cron → detecta proyectos en riesgo (>30% vencidas) ─────
resource "aws_lambda_function" "alerts_engine" {
  function_name    = "${local.name_prefix}-alerts-engine"
  role             = data.aws_iam_role.lab.arn
  runtime          = local.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.alerts_engine.output_path
  source_code_hash = data.archive_file.alerts_engine.output_base64sha256
  timeout          = 60
  memory_size      = 256

  environment { variables = local.lambda_env }
}

# ── 4) scheduled-reports: cron diario/semanal → genera reportes → S3 ─────────
resource "aws_lambda_function" "scheduled_reports" {
  function_name    = "${local.name_prefix}-scheduled-reports"
  role             = data.aws_iam_role.lab.arn
  runtime          = local.lambda_runtime
  handler          = "index.handler"
  filename         = data.archive_file.scheduled_reports.output_path
  source_code_hash = data.archive_file.scheduled_reports.output_base64sha256
  timeout          = 120
  memory_size      = 512

  environment { variables = local.lambda_env }
}
