# ─────────────────────────────────────────────────────────────────────────────
# Secrets Manager: secretos JWT (nunca en el repo ni en variables planas)
# Genera valores aleatorios la primera vez; ECS los inyecta como env vars.
# ─────────────────────────────────────────────────────────────────────────────

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt" {
  name        = "${local.name_prefix}/jwt"
  description = "Secretos de firma JWT para TaskFlow backend"
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    JWT_SECRET         = random_password.jwt_secret.result
    JWT_REFRESH_SECRET = random_password.jwt_refresh_secret.result
  })

  # No re-generar el secreto en cada apply (rotar manualmente cuando sea necesario)
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Secret para la API key de Groq (IA). Se crea solo si se proporcionó la clave.
# Va en Secrets Manager y NO como variable de entorno plana en la task definition
# (que sería visible vía `aws ecs describe-task-definition`).
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "groq" {
  count       = var.groq_api_key != "" ? 1 : 0
  name        = "${local.name_prefix}/groq"
  description = "API key de Groq (IA) para TaskFlow backend"
}

resource "aws_secretsmanager_secret_version" "groq" {
  count         = var.groq_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.groq[0].id
  secret_string = jsonencode({ GROQ_API_KEY = var.groq_api_key })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
