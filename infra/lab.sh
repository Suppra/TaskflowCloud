#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# lab.sh — Helper de despliegue para TaskFlow Cloud en AWS Academy Learner Lab
#
# Automatiza el ciclo destroy/apply y el redeploy de backend (ECR) y frontend
# (S3 + CloudFront), incluyendo el vaciado de buckets (que `terraform destroy`
# necesita para no quedarse colgado).
#
# REQUISITOS antes de ejecutar:
#   - Credenciales temporales del Learner Lab exportadas en la terminal:
#       export AWS_ACCESS_KEY_ID=...
#       export AWS_SECRET_ACCESS_KEY=...
#       export AWS_SESSION_TOKEN=...
#       export AWS_DEFAULT_REGION=us-east-1
#   - terraform, aws cli, docker y node instalados.
#   - La infra ya adaptada al Learner Lab (ver infra/DEPLOY_LEARNER_LAB.prompt.md).
#
# USO:
#   ./infra/lab.sh apply           # crea/actualiza la infraestructura
#   ./infra/lab.sh backend         # build + push imagen + force deploy ECS
#   ./infra/lab.sh frontend        # build + sync S3 + invalidación CloudFront
#   ./infra/lab.sh redeploy        # apply + backend + frontend (todo de una)
#   ./infra/lab.sh empty-buckets   # vacía los 3 buckets S3
#   ./infra/lab.sh teardown        # empty-buckets + terraform destroy
#   ./infra/lab.sh outputs         # imprime los outputs de Terraform
#   ./infra/lab.sh url             # imprime la URL pública (CloudFront)
#
# Variables opcionales (se pasan a Terraform):
#   GROQ_API_KEY=...   ALERTS_EMAIL=...
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Directorios (el script vive en infra/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$SCRIPT_DIR/terraform"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# Variables de Terraform (vacías si no se exportaron)
GROQ_API_KEY="${GROQ_API_KEY:-}"
ALERTS_EMAIL="${ALERTS_EMAIL:-}"
TF_VARS=(-var "groq_api_key=$GROQ_API_KEY" -var "alerts_email=$ALERTS_EMAIL")

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

require_creds() {
  aws sts get-caller-identity >/dev/null 2>&1 \
    || die "Sin credenciales AWS válidas. Exporta las del Learner Lab (AWS Details → CLI) y reintenta."
}

tf_out() {
  # Devuelve un output de Terraform, vacío si no existe (no rompe el script)
  terraform -chdir="$TF_DIR" output -raw "$1" 2>/dev/null || true
}

empty_bucket() {
  local b="$1"
  [ -z "$b" ] && return 0
  if aws s3api head-bucket --bucket "$b" >/dev/null 2>&1; then
    log "Vaciando bucket s3://$b"
    aws s3 rm "s3://$b" --recursive >/dev/null 2>&1 || true
    # Borrar versiones si el bucket tuviera versionado habilitado
    aws s3api list-object-versions --bucket "$b" \
      --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null \
      | grep -q '"Key"' && \
      aws s3api delete-objects --bucket "$b" \
        --delete "$(aws s3api list-object-versions --bucket "$b" \
          --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json)" >/dev/null 2>&1 || true
    ok "Bucket $b vaciado"
  fi
}

# ── Comandos ─────────────────────────────────────────────────────────────────
cmd_apply() {
  require_creds
  log "terraform init"
  terraform -chdir="$TF_DIR" init -input=false
  log "terraform apply (Learner Lab)"
  terraform -chdir="$TF_DIR" apply -input=false -auto-approve "${TF_VARS[@]}"
  ok "Infraestructura aplicada"
  cmd_url
}

cmd_backend() {
  require_creds
  local ecr cluster service
  ecr="$(tf_out ecr_repository_url)"
  cluster="$(tf_out ecs_cluster_name)"
  service="$(tf_out ecs_service_name)"
  [ -z "$ecr" ] && die "No hay output 'ecr_repository_url'. ¿Ejecutaste 'apply' primero?"

  log "Login en ECR"
  aws ecr get-login-password --region "$REGION" \
    | docker login --username AWS --password-stdin "$ecr"

  log "Build de la imagen del backend"
  docker build -t "$ecr:latest" "$ROOT_DIR/backend"

  log "Push a ECR"
  docker push "$ecr:latest"

  if [ -n "$cluster" ] && [ -n "$service" ]; then
    log "Forzando nuevo despliegue en ECS ($service)"
    aws ecs update-service --cluster "$cluster" --service "$service" \
      --force-new-deployment >/dev/null
    ok "ECS redeplegando — espera a que la tarea quede healthy"
  else
    warn "No se encontraron outputs de ECS; omito el force-deploy."
  fi
}

cmd_frontend() {
  require_creds
  local bucket dist
  bucket="$(tf_out frontend_bucket)"
  dist="$(tf_out cloudfront_distribution_id)"
  [ -z "$bucket" ] && die "No hay output 'frontend_bucket'. ¿Ejecutaste 'apply' primero?"

  log "Build del frontend"
  ( cd "$ROOT_DIR/frontend" && npm ci && npm run build )

  log "Sync a S3 (s3://$bucket)"
  aws s3 sync "$ROOT_DIR/frontend/dist" "s3://$bucket" --delete

  if [ -n "$dist" ]; then
    log "Invalidando CloudFront ($dist)"
    aws cloudfront create-invalidation --distribution-id "$dist" --paths "/*" >/dev/null
    ok "Frontend desplegado e invalidado"
  else
    warn "No hay output 'cloudfront_distribution_id'; omito la invalidación."
  fi
  cmd_url
}

cmd_redeploy() {
  cmd_apply
  cmd_backend
  cmd_frontend
  ok "Redeploy completo"
}

cmd_empty_buckets() {
  require_creds
  for out in frontend_bucket attachments_bucket reports_bucket; do
    empty_bucket "$(tf_out "$out")"
  done
  # Fallback: si los outputs de buckets no existen, intenta por convención de nombre
  if [ -z "$(tf_out frontend_bucket)" ]; then
    warn "Sin outputs de buckets; vacía manualmente con: aws s3 rm s3://<bucket> --recursive"
  fi
}

cmd_teardown() {
  require_creds
  warn "Esto DESTRUYE toda la infraestructura del lab."
  cmd_empty_buckets
  log "terraform destroy"
  terraform -chdir="$TF_DIR" destroy -input=false -auto-approve "${TF_VARS[@]}"
  ok "Infraestructura destruida — presupuesto preservado"
}

cmd_outputs() {
  terraform -chdir="$TF_DIR" output
}

cmd_url() {
  local domain
  domain="$(tf_out cloudfront_domain)"
  [ -z "$domain" ] && domain="$(tf_out cloudfront_distribution_domain_name)"
  if [ -n "$domain" ]; then
    printf '\n\033[1;32m🌐 App: https://%s\033[0m\n' "$domain"
  else
    warn "No hay output del dominio CloudFront (añade 'cloudfront_domain' a outputs.tf)."
  fi
}

# ── Dispatcher ───────────────────────────────────────────────────────────────
case "${1:-}" in
  apply)         cmd_apply ;;
  backend)       cmd_backend ;;
  frontend)      cmd_frontend ;;
  redeploy)      cmd_redeploy ;;
  empty-buckets) cmd_empty_buckets ;;
  teardown)      cmd_teardown ;;
  outputs)       cmd_outputs ;;
  url)           cmd_url ;;
  *)
    grep -E '^#( |   )' "$0" | sed -E 's/^# ?//' | head -40
    exit 1 ;;
esac
