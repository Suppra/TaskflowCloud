# ─────────────────────────────────────────────────────────────────────────────
# Variables de entrada
# ─────────────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "Región principal de despliegue"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno (dev | staging | prod). Se usa como sufijo de recursos."
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Prefijo común para nombrar recursos"
  type        = string
  default     = "taskflow"
}

# ── Red ──────────────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR de la VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Número de zonas de disponibilidad (mínimo 2 para ALB)"
  type        = number
  default     = 2
}

# ── Backend / ECS ──────────────────────────────────────────────────────────────
variable "backend_image_tag" {
  description = "Tag de la imagen del backend en ECR a desplegar"
  type        = string
  default     = "latest"
}

variable "backend_cpu" {
  description = "vCPU para la task de Fargate (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memoria (MiB) para la task de Fargate"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Número de tasks del servicio backend"
  type        = number
  default     = 2
}

variable "backend_port" {
  description = "Puerto en el que escucha el backend Express"
  type        = number
  default     = 3001
}

# ── DNS / Dominio (opcional) ─────────────────────────────────────────────────
variable "domain_name" {
  description = "Dominio raíz gestionado en Route53. Déjalo vacío para omitir DNS/ACM."
  type        = string
  default     = ""
}

variable "create_route53" {
  description = "Si crear registros Route53 + certificados ACM"
  type        = bool
  default     = false
}

# ── Aplicación ───────────────────────────────────────────────────────────────
variable "ses_from_email" {
  description = "Email verificado en SES usado como remitente"
  type        = string
  default     = "noreply@taskflow.dev"
}

variable "jwt_expires_in" {
  description = "Expiración del access token"
  type        = string
  default     = "15m"
}

variable "jwt_refresh_expires_in" {
  description = "Expiración del refresh token"
  type        = string
  default     = "7d"
}

variable "max_tasks_per_member" {
  description = "Tope de tareas abiertas que el auto-asignador intenta no superar por persona"
  type        = number
  default     = 8
}

variable "log_retention_days" {
  description = "Retención de logs en CloudWatch"
  type        = number
  default     = 30
}

variable "groq_api_key" {
  description = "API Key de Groq para la feature de generación de tareas con IA (LLaMA 3.3 70B). Completamente gratis en https://console.groq.com. Dejar vacío para deshabilitar la feature."
  type        = string
  default     = ""
  sensitive   = true
}

variable "alerts_email" {
  description = "Email que recibe las alarmas operativas de CloudWatch (DLQ, 5xx). Vacío = sin suscripción (las alarmas siguen registrándose, pero sin notificación)."
  type        = string
  default     = ""
}
