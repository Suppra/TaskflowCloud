# Teardown seguro (budget)

Checklist para apagar todo sin dejar costos residuales.

## Pre-check

- [ ] Credenciales AWS vigentes en terminal.
- [ ] Region activa: `us-east-1`.
- [ ] Estas en `infra/terraform`.

## 1) Vaciar buckets S3 administrados por Terraform

```powershell
Set-Location "infra/terraform"
```

Luego vacia manualmente (si existen objetos) los buckets de reportes y adjuntos desde consola S3, o por CLI con sus nombres reales.

## 2) Destruir infraestructura

```powershell
terraform destroy -auto-approve -var "alerts_email=cristianfwc@gmail.com"
```

Si usas Groq:

```powershell
terraform destroy -auto-approve -var "groq_api_key=<GROQ_API_KEY>" -var "alerts_email=cristianfwc@gmail.com"
```

## 3) Verificacion post-destroy

- [ ] ECS cluster/service eliminados.
- [ ] ALB y target groups eliminados.
- [ ] Lambdas y reglas EventBridge eliminadas.
- [ ] Colas SQS/DLQ eliminadas.
- [ ] Buckets S3 de app eliminados.
- [ ] DynamoDB tables eliminadas.
- [ ] ECR repo eliminado (si aplica en Terraform state).

## 4) Limpieza local

- [ ] Mantener estado local solo si quieres auditoria.
- [ ] Revocar/descartar credenciales expiradas del lab.

## Nota

CloudFront no se usa en esta variante del lab (arquitectura ALB-only). Los costos principales a vigilar aqui son ALB, ECS y almacenamiento/requests de S3.
